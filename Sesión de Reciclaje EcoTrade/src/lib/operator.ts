import { supabase } from '@/lib/supabase/client';
import { finalizarSesion } from '@/lib/sessions';
import { calculateAndSaveTrustScore } from '@/lib/trustScore';
import type { RecyclingSession, SessionStatus, TrustLevel } from '@/app/types';

// ─── Tipos ────────────────────────────────────────────────────────

export interface ReviewFilters {
  confianza?: TrustLevel;
  kgAlto?: boolean;
  sinEvidencia?: boolean;
  pendienteOnChain?: boolean;
}

export interface ReviewQueueItem {
  id: string;
  sessionNumber: string;
  punto: string;
  totalKg: number;
  trustLevel?: TrustLevel;
  trustScore?: number;
  status: SessionStatus;
  scheduledDate?: string;
  evidenceCount: number;
  hasReceipt: boolean;
  createdAt: Date;
}

export interface ReviewDetailData {
  session: Omit<RecyclingSession, 'materials'> & {
    materials: (RecyclingSession['materials'][0] & { id: string })[];
  };
  reportedVsVerified: {
    materialId: string;
    type: string;
    reportedKg: number;
    verifiedKg?: number;
    diffKg?: number;
  }[];
}

export interface VerifiedMaterial {
  materialId: string;
  verifiedKg: number;
  verified: boolean;
}

// ────────────────────────────────────────────────────────────
// HELPER INTERNO: Insertar en session_timeline
// ────────────────────────────────────────────────────────────
async function insertTimeline(
  sessionId: string,
  status: string,
  actor: 'Usuario' | 'Operador' | 'Sistema',
  note?: string
): Promise<void> {
  const { error } = await supabase.rpc('insert_session_timeline', {
    p_session_id: sessionId,
    p_status: status,
    p_actor: actor,
    p_note: note ?? null,
  });
  if (error) {
    console.warn('[EcoTrade] insert_session_timeline RPC warning:', error.message);
  }
}

// ────────────────────────────────────────────────────────────
// 1. getReviewQueue
// ────────────────────────────────────────────────────────────
export async function getReviewQueue(filters?: ReviewFilters): Promise<ReviewQueueItem[]> {
  // Traer las sesiones relevantes en memoria para hacer el filtrado complejo
  // que incluye or/and dates de manera segura en JS.
  const { data, error } = await supabase
    .from('recycling_sessions')
    .select(`
      id,
      session_number,
      status,
      scheduled_date,
      total_kg,
      created_at,
      collection_points (name),
      trust_scores (score, level),
      session_evidence (id),
      solana_receipts (signature)
    `)
    .in('status', ['Programada', 'En curso', 'Pendiente de verificación']);

  if (error) {
    throw new Error(`[getReviewQueue] Error: ${error.message}`);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  let items = (data as any[]).map((row): ReviewQueueItem => {
    const cp = Array.isArray(row.collection_points) ? row.collection_points[0] : row.collection_points;
    const ts = Array.isArray(row.trust_scores) ? row.trust_scores[0] : row.trust_scores;
    const receiptsArr = Array.isArray(row.solana_receipts) ? row.solana_receipts : (row.solana_receipts ? [row.solana_receipts] : []);

    return {
      id: row.id,
      sessionNumber: row.session_number,
      punto: cp?.name || 'Desconocido',
      totalKg: Number(row.total_kg),
      trustLevel: ts?.level as TrustLevel | undefined,
      trustScore: ts?.score ? Number(ts.score) : undefined,
      status: row.status as SessionStatus,
      scheduledDate: row.scheduled_date || undefined,
      evidenceCount: Array.isArray(row.session_evidence) ? row.session_evidence.length : 0,
      hasReceipt: receiptsArr.length > 0,
      createdAt: new Date(row.created_at)
    };
  });

  // Filtrar 'Programada' que ya pasaron su fecha (scheduled_date <= hoy) o sin fecha pero viejas
  items = items.filter(item => {
    if (item.status === 'En curso' || item.status === 'Pendiente de verificación') return true;
    if (item.status === 'Programada') {
      if (!item.scheduledDate) return false;
      return item.scheduledDate < todayStr;
    }
    return false;
  });

  // Aplicar filtros adicionales
  if (filters) {
    if (filters.confianza) {
      items = items.filter(i => i.trustLevel === filters.confianza);
    }
    if (filters.kgAlto) {
      items = items.filter(i => i.totalKg > 100);
    }
    if (filters.sinEvidencia) {
      items = items.filter(i => i.evidenceCount === 0);
    }
    if (filters.pendienteOnChain) {
      // verificada pero sin solana_receipt
      items = items.filter(i => !i.hasReceipt);
    }
  }

  // Ordenar: primero 'Pendiente de verificación', luego por trust_score.score ASC
  items.sort((a, b) => {
    if (a.status === 'Pendiente de verificación' && b.status !== 'Pendiente de verificación') return -1;
    if (b.status === 'Pendiente de verificación' && a.status !== 'Pendiente de verificación') return 1;
    
    const scoreA = a.trustScore ?? 100;
    const scoreB = b.trustScore ?? 100;
    return scoreA - scoreB;
  });

  return items;
}

// ────────────────────────────────────────────────────────────
// 2. getReviewDetail
// ────────────────────────────────────────────────────────────
export async function getReviewDetail(sessionId: string): Promise<ReviewDetailData> {
  const { data, error } = await supabase
    .from('recycling_sessions')
    .select(`
      id, session_number, status, scheduled_date, scheduled_time,
      total_kg, verified_total_kg, eco_coins, estimated_eco_coins,
      evidence_hash, cancellation_reason, operator_note, verified_by, qr_code,
      created_at, updated_at, user_id, operator_id,
      collection_points (id, name, address, schedule, accepted_materials, instructions, limits),
      session_materials (id, material_type, kg, observation, verified, verified_kg),
      session_evidence (id, storage_path, public_url, file_name, uploaded_at),
      trust_scores (score, level, requires_review, signals),
      solana_receipts (signature, cluster, explorer_url, program_id, emitted_at),
      session_timeline (status, actor, note, created_at)
    `)
    .eq('id', sessionId)
    .single();

  if (error || !data) {
    throw new Error(`[getReviewDetail] Error al obtener detalles de la sesión ${sessionId}`);
  }

  // Map to normal RecylingSession shape, but keep 'id' on materials
  const raw = data as any;
  const cp = Array.isArray(raw.collection_points) ? raw.collection_points[0] : raw.collection_points;
  const ts = Array.isArray(raw.trust_scores) ? raw.trust_scores[0] : raw.trust_scores;
  const sr = Array.isArray(raw.solana_receipts) ? raw.solana_receipts[0] : raw.solana_receipts;
  const evs = (raw.session_evidence || []).map((e: any) => e.public_url).filter(Boolean);
  
  const timeline = (raw.session_timeline || []).map((t: any) => ({
    status: t.status as SessionStatus,
    timestamp: new Date(t.created_at),
    actor: t.actor,
    note: t.note
  })).sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime());

  const materials = (raw.session_materials || []).map((m: any) => ({
    id: m.id,
    type: m.material_type,
    kg: Number(m.kg),
    observation: m.observation,
    verified: m.verified,
    verifiedKg: m.verified_kg != null ? Number(m.verified_kg) : undefined
  }));

  const sessionObj = {
    id: raw.id,
    sessionNumber: raw.session_number,
    status: raw.status as SessionStatus,
    point: {
      id: cp?.id || '',
      name: cp?.name || '',
      address: cp?.address || '',
      schedule: cp?.schedule || '',
      acceptedMaterials: cp?.accepted_materials || []
    },
    scheduledDate: raw.scheduled_date || undefined,
    scheduledTime: raw.scheduled_time || undefined,
    evidence: evs.length > 0 ? evs : undefined,
    evidenceHash: raw.evidence_hash || undefined,
    totalKg: Number(raw.total_kg),
    verifiedTotalKg: raw.verified_total_kg != null ? Number(raw.verified_total_kg) : undefined,
    ecoCoins: raw.eco_coins,
    estimatedEcoCoins: raw.estimated_eco_coins,
    trustScore: ts ? {
      score: ts.score,
      level: ts.level as TrustLevel,
      requiresReview: ts.requires_review,
      signals: ts.signals
    } : undefined,
    solanaReceipt: sr ? {
      signature: sr.signature,
      cluster: sr.cluster,
      explorerUrl: sr.explorer_url,
      emittedAt: new Date(sr.emitted_at),
      programId: sr.program_id
    } : undefined,
    timeline,
    cancellationReason: raw.cancellation_reason || undefined,
    operatorNote: raw.operator_note || undefined,
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at),
    userId: raw.user_id,
    operatorId: raw.operator_id,
    verifiedBy: raw.verified_by,
    qrCode: raw.qr_code
  };

  const reportedVsVerified = materials.map((m: any) => ({
    materialId: m.id,
    type: m.type,
    reportedKg: m.kg,
    verifiedKg: m.verifiedKg,
    diffKg: m.verifiedKg != null ? m.verifiedKg - m.kg : undefined
  }));

  return {
    session: {
      ...sessionObj,
      materials
    },
    reportedVsVerified
  };
}

// ────────────────────────────────────────────────────────────
// 3. aprobarSesion
// ────────────────────────────────────────────────────────────
export async function aprobarSesion(
  sessionId: string, 
  verifiedMaterials: VerifiedMaterial[], 
  operatorNote?: string
): Promise<void> {
  // a) Update cada session_material
  for (const vm of verifiedMaterials) {
    const { error: mError } = await supabase
      .from('session_materials')
      .update({
        verified_kg: vm.verifiedKg,
        verified: vm.verified
      })
      .eq('id', vm.materialId);
      
    if (mError) {
      console.warn(`[aprobarSesion] Error actualizando material ${vm.materialId}: ${mError.message}`);
    }
  }

  // b) Recalcular verified_total_kg
  const verifiedTotalKg = verifiedMaterials.reduce((acc, curr) => acc + curr.verifiedKg, 0);

  // Conseguir UID del auth actuando como operador
  const { data: { user } } = await supabase.auth.getUser();
  const operatorId = user?.id || 'Operador_Desconocido';

  // c) Guarda operatorNote si existe en la sesión
  if (operatorNote) {
    const { error: noteError } = await supabase
      .from('recycling_sessions')
      .update({ operator_note: operatorNote })
      .eq('id', sessionId);
    if (noteError) {
       console.warn(`[aprobarSesion] Error guardando operator_note: ${noteError.message}`);
    }
  }

  // d) Llama a finalizarSesion
  // (finalizarSesion actualiza estado a 'Completada', suma ecoCoins, actualiza profile, y emite on-chain, e inserta a timeline temporalmente, pero nosotros queremos la inserción explícita de e)
  await finalizarSesion(sessionId, verifiedTotalKg, operatorId);

  // e) Inserta timeline final
  await insertTimeline(
    sessionId,
    'Completada',
    'Operador',
    `Aprobado por ${user?.email || operatorId}${operatorNote ? ' - Nota: ' + operatorNote : ''}`
  );
}

// ────────────────────────────────────────────────────────────
// 4. rechazarSesion
// ────────────────────────────────────────────────────────────
export async function rechazarSesion(
  sessionId: string, 
  motivo: string, 
  tipo: 'incidencia' | 'rechazar'
): Promise<void> {
  if (tipo === 'rechazar') {
    // Cancela la sesión
    const { error } = await supabase
      .from('recycling_sessions')
      .update({
        status: 'Cancelada',
        cancellation_reason: motivo
      })
      .eq('id', sessionId);

    if (error) throw new Error(`[rechazarSesion] ${error.message}`);
    
    await insertTimeline(sessionId, 'Cancelada', 'Operador', `Rechazo: ${motivo}`);
  } else {
    // Es una incidencia, la devuelve al estado pendiente pero lo registramos
    const { error } = await supabase
      .from('recycling_sessions')
      .update({
        status: 'Pendiente de verificación',
        operator_note: motivo // Guardamos el motivo en la nota del operador
      })
      .eq('id', sessionId);

    if (error) throw new Error(`[rechazarSesion-incidencia] ${error.message}`);
    
    await insertTimeline(sessionId, 'Pendiente de verificación', 'Operador', `Incidencia registrada: ${motivo}`);
  }
}

// ────────────────────────────────────────────────────────────
// 5. solicitarEvidencia
// ────────────────────────────────────────────────────────────
export async function solicitarEvidencia(sessionId: string, mensaje: string): Promise<void> {
  const { error } = await supabase
    .from('recycling_sessions')
    .update({
      status: 'Pendiente de verificación',
      operator_note: mensaje
    })
    .eq('id', sessionId);

  if (error) throw new Error(`[solicitarEvidencia] ${error.message}`);

  await insertTimeline(sessionId, 'Pendiente de verificación', 'Operador', `Evidencia solicitada: ${mensaje}`);
}

// ────────────────────────────────────────────────────────────
// 6. iniciarSesionPresencial
// ────────────────────────────────────────────────────────────
export async function iniciarSesionPresencial(sessionId: string, operatorId: string): Promise<void> {
  const { error: updateError } = await supabase
    .from('recycling_sessions')
    .update({
      status: 'En curso',
      operator_id: operatorId
    })
    .eq('id', sessionId);

  if (updateError) throw new Error(`[iniciarSesionPresencial] ${updateError.message}`);

  await insertTimeline(sessionId, 'En curso', 'Operador', 'El operador ha iniciado la revisión presencialmente.');

  // Recalcula trust_score ahora que hay confirmación presencial
  try {
    await calculateAndSaveTrustScore(sessionId);
  } catch (err) {
    console.warn('[iniciarSesionPresencial] Advertencia calculando trust score:', err);
  }
}
