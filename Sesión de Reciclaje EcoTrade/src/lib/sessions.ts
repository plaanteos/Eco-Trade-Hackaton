// ============================================================
//  EcoTrade — Sessions Service
//  src/lib/sessions.ts
//
//  CRUD completo de sesiones de reciclaje.
//  Usa Supabase JS Client v2 con los tipos del schema.sql.
//
//  NOTA RLS:
//    - session_timeline, trust_scores y solana_receipts solo
//      permiten INSERT desde service_role.
//    - Las operaciones que escriben en esas tablas se delegan
//      a RPCs con SECURITY DEFINER (ver sql al final del archivo).
//    - Los updates de eco_coins_balance en profiles también
//      requieren RPC o service_role.
// ============================================================

import { supabase } from "@/lib/supabase/client";
import { calculateAndSaveTrustScore } from "@/lib/trustScore";
import { uploadEvidence } from "@/lib/storage/uploadEvidence";
import type {
  RecyclingSession,
  SessionStatus,
  MaterialType,
  CollectionPoint,
  Material,
  TrustScore,
  TrustSignal,
  TrustLevel,
  SolanaReceipt,
  SessionTimeline,
} from "@/app/types";

// ─── Tipos de entrada ────────────────────────────────────────

export interface MaterialInput {
  type: MaterialType;
  kg: number;
  observation?: string;
}

export interface CreateSessionInput {
  /** UUID del punto de acopio seleccionado */
  collectionPointId: string;
  /** Fecha programada ISO (YYYY-MM-DD) — opcional en Borrador */
  scheduledDate?: string;
  /** Hora programada (HH:MM) — opcional */
  scheduledTime?: string;
  /** Materiales a declarar */
  materials: MaterialInput[];
  /** Archivos de evidencia (subidos a Storage) */
  evidence?: File[];
}

/** Datos públicos expuestos en /verificar/:id */
export interface PublicSessionData {
  sessionNumber: string;
  point: Pick<CollectionPoint, "name" | "address">;
  scheduledDate?: string;
  scheduledTime?: string;
  totalKg: number;
  verifiedTotalKg?: number;
  ecoCoins: number;
  materials: Pick<Material, "type" | "kg" | "verified" | "verifiedKg">[];
  evidenceHash?: string;
  solanaReceipt?: SolanaReceipt;
  status: SessionStatus;
  createdAt: Date;
}

// ─── Tipos de fila de base de datos (raw) ────────────────────

interface RawSession {
  id: string;
  session_number: string;
  user_id: string;
  operator_id: string | null;
  collection_point_id: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  total_kg: number;
  verified_total_kg: number | null;
  eco_coins: number;
  estimated_eco_coins: number;
  evidence_hash: string | null;
  cancellation_reason: string | null;
  operator_note: string | null;
  verified_by: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
  collection_points: RawCollectionPoint | null;
  session_materials: RawMaterial[];
  session_evidence: RawEvidence[];
  trust_scores: RawTrustScore | null;
  solana_receipts: RawSolanaReceipt | null;
  session_timeline: RawTimeline[];
}

interface RawCollectionPoint {
  id: string;
  name: string;
  address: string;
  schedule: string;
  accepted_materials: string[];
  instructions: string | null;
  limits: string | null;
}

interface RawMaterial {
  id: string;
  material_type: string;
  kg: number;
  observation: string | null;
  verified: boolean;
  verified_kg: number | null;
}

interface RawEvidence {
  id: string;
  storage_path: string;
  public_url: string | null;
  file_name: string | null;
  uploaded_at: string;
}

interface RawTrustScore {
  score: number;
  level: string;
  requires_review: boolean;
  signals: TrustSignal[];
}

interface RawSolanaReceipt {
  signature: string;
  cluster: string;
  explorer_url: string | null;
  program_id: string | null;
  emitted_at: string;
}

interface RawTimeline {
  status: string;
  actor: string | null;
  note: string | null;
  created_at: string;
}

// ─── Query de sesión completa (columnas a traer) ─────────────

const FULL_SESSION_SELECT = `
  id,
  session_number,
  user_id,
  operator_id,
  collection_point_id,
  status,
  scheduled_date,
  scheduled_time,
  total_kg,
  verified_total_kg,
  eco_coins,
  estimated_eco_coins,
  evidence_hash,
  cancellation_reason,
  operator_note,
  verified_by,
  qr_code,
  created_at,
  updated_at,
  collection_points (
    id,
    name,
    address,
    schedule,
    accepted_materials,
    instructions,
    limits
  ),
  session_materials (
    id,
    material_type,
    kg,
    observation,
    verified,
    verified_kg
  ),
  session_evidence (
    id,
    storage_path,
    public_url,
    file_name,
    uploaded_at
  ),
  trust_scores (
    score,
    level,
    requires_review,
    signals
  ),
  solana_receipts (
    signature,
    cluster,
    explorer_url,
    program_id,
    emitted_at
  ),
  session_timeline (
    status,
    actor,
    note,
    created_at
  )
`.trim();

// ─── Mappers: raw DB → dominio TypeScript ────────────────────

function mapCollectionPoint(raw: RawCollectionPoint): CollectionPoint {
  return {
    id: raw.id,
    name: raw.name,
    address: raw.address,
    schedule: raw.schedule,
    acceptedMaterials: raw.accepted_materials as MaterialType[],
    instructions: raw.instructions ?? undefined,
    limits: raw.limits ?? undefined,
  };
}

function mapMaterials(rows: RawMaterial[]): Material[] {
  return rows.map((m) => ({
    type: m.material_type as MaterialType,
    kg: Number(m.kg),
    observation: m.observation ?? undefined,
    verified: m.verified,
    verifiedKg: m.verified_kg != null ? Number(m.verified_kg) : undefined,
  }));
}

function mapTrustScore(raw: RawTrustScore | null): TrustScore | undefined {
  if (!raw) return undefined;
  return {
    score: raw.score,
    level: raw.level as TrustLevel,
    requiresReview: raw.requires_review,
    signals: raw.signals,
  };
}

function mapSolanaReceipt(raw: RawSolanaReceipt | null): SolanaReceipt | undefined {
  if (!raw) return undefined;
  return {
    signature: raw.signature,
    cluster: raw.cluster as "devnet" | "mainnet-beta",
    explorerUrl: raw.explorer_url ?? `https://explorer.solana.com/tx/${raw.signature}?cluster=devnet`,
    emittedAt: new Date(raw.emitted_at),
    programId: raw.program_id ?? undefined,
  };
}

function mapTimeline(rows: RawTimeline[]): SessionTimeline[] {
  return [...rows]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((t) => ({
      status: t.status as SessionStatus,
      timestamp: new Date(t.created_at),
      actor: t.actor ?? undefined,
      note: t.note ?? undefined,
    }));
}

function mapSession(raw: RawSession): RecyclingSession {
  const point = raw.collection_points
    ? mapCollectionPoint(raw.collection_points)
    : {
        id: raw.collection_point_id,
        name: "Punto desconocido",
        address: "",
        schedule: "",
        acceptedMaterials: [],
      };

  const evidenceUrls = raw.session_evidence
    .filter((e) => e.public_url)
    .map((e) => e.public_url as string);

  // Ordenar timeline cronológicamente
  const sortedTimeline = mapTimeline(raw.session_timeline ?? []);

  return {
    id: raw.id,
    sessionNumber: raw.session_number,
    status: raw.status as SessionStatus,
    point,
    scheduledDate: raw.scheduled_date ?? undefined,
    scheduledTime: raw.scheduled_time ?? undefined,
    materials: mapMaterials(raw.session_materials ?? []),
    evidence: evidenceUrls.length > 0 ? evidenceUrls : undefined,
    evidenceHash: raw.evidence_hash ?? undefined,
    totalKg: Number(raw.total_kg),
    verifiedTotalKg: raw.verified_total_kg != null ? Number(raw.verified_total_kg) : undefined,
    ecoCoins: raw.eco_coins,
    estimatedEcoCoins: raw.estimated_eco_coins,
    trustScore: mapTrustScore(
      Array.isArray(raw.trust_scores) ? raw.trust_scores[0] ?? null : raw.trust_scores
    ),
    solanaReceipt: mapSolanaReceipt(
      Array.isArray(raw.solana_receipts) ? raw.solana_receipts[0] ?? null : raw.solana_receipts
    ),
    timeline: sortedTimeline,
    cancellationReason: raw.cancellation_reason ?? undefined,
    operatorNote: raw.operator_note ?? undefined,
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at),
    userId: raw.user_id,
    operatorId: raw.operator_id ?? undefined,
    verifiedBy: raw.verified_by ?? undefined,
    qrCode: raw.qr_code ?? undefined,
  };
}

// ────────────────────────────────────────────────────────────
// HELPER INTERNO: Insertar en session_timeline
// Requiere RPC con SECURITY DEFINER (ver SQL al final).
// ────────────────────────────────────────────────────────────
async function insertTimeline(
  sessionId: string,
  status: SessionStatus,
  actor: "Usuario" | "Operador" | "Sistema",
  note?: string
): Promise<void> {
  const { error } = await supabase.rpc("insert_session_timeline", {
    p_session_id: sessionId,
    p_status: status,
    p_actor: actor,
    p_note: note ?? null,
  });
  if (error) {
    // Fallback: log warning, no bloquear flujo principal
    console.warn("[EcoTrade] insert_session_timeline RPC warning:", error.message);
  }
}

// calculateAndSaveTrustScore is imported from @/lib/trustScore
// (the full weighted-signal engine that loads its own data from Supabase)

// ────────────────────────────────────────────────────────────
// HELPER INTERNO: Emitir recibo Solana (simulado en devnet)
// ────────────────────────────────────────────────────────────

async function emitirReciboSolana(
  sessionId: string,
  sessionNumber: string
): Promise<void> {
  // Devnet: genera firma determinística a partir del sessionId + timestamp
  const encoder = new TextEncoder();
  const data = encoder.encode(`ecotrade:solana:${sessionId}:${Date.now()}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 88);

  const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

  const { error } = await supabase.rpc("insert_solana_receipt", {
    p_session_id: sessionId,
    p_signature: signature,
    p_cluster: "devnet",
    p_explorer_url: explorerUrl,
    p_program_id: null,
  });

  if (error) {
    console.warn("[EcoTrade] insert_solana_receipt RPC warning:", error.message);
  }

  // Log para debug en hackathon
  console.info(
    `[EcoTrade] Recibo Solana devnet emitido para sesión ${sessionNumber}:`,
    explorerUrl
  );
}

// ────────────────────────────────────────────────────────────
// 1. getUserSessions
// ────────────────────────────────────────────────────────────

/**
 * Retorna todas las sesiones del usuario con datos de punto,
 * materiales, evidencias, trustScore y solanaReceipt.
 * Orden: más recientes primero.
 */
export async function getUserSessions(userId: string): Promise<RecyclingSession[]> {
  const { data, error } = await supabase
    .from("recycling_sessions")
    .select(FULL_SESSION_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`[getUserSessions] ${error.message}`);
  }

  return (data as unknown as RawSession[]).map(mapSession);
}

// ────────────────────────────────────────────────────────────
// 2. getSessionById
// ────────────────────────────────────────────────────────────

/**
 * Retorna una sesión completa por su ID, incluyendo todos los
 * datos relacionados. Retorna null si no existe o sin acceso.
 */
export async function getSessionById(sessionId: string): Promise<RecyclingSession | null> {
  const { data, error } = await supabase
    .from("recycling_sessions")
    .select(FULL_SESSION_SELECT)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`[getSessionById] ${error.message}`);
  }

  if (!data) return null;
  return mapSession(data as unknown as RawSession);
}

// ────────────────────────────────────────────────────────────
// 3. createSession
// ────────────────────────────────────────────────────────────

/**
 * Crea una sesión de reciclaje completa:
 *  1. Inserta en recycling_sessions (status: Borrador)
 *  2. Inserta materiales en session_materials
 *  3. Sube evidencias a Storage (si las hay)
 *  4. Calcula y guarda el trust_score
 *  5. Inserta entrada inicial en session_timeline
 *  6. Retorna la sesión completa
 */
export async function createSession(data: CreateSessionInput): Promise<RecyclingSession> {
  // ── 0. Obtener usuario actual ─────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Usuario no autenticado.");
  }

  // ── 1. Calcular totales ───────────────────────────────────
  const totalKg = data.materials.reduce((sum, m) => sum + m.kg, 0);
  const estimatedEcoCoins = Math.floor(totalKg / 10);

  // ── 2. Insertar sesión base ───────────────────────────────
  const { data: sessionRow, error: insertError } = await supabase
    .from("recycling_sessions")
    .insert({
      user_id: user.id,
      collection_point_id: data.collectionPointId,
      status: "Borrador",
      scheduled_date: data.scheduledDate ?? null,
      scheduled_time: data.scheduledTime ?? null,
      total_kg: totalKg,
      estimated_eco_coins: estimatedEcoCoins,
      eco_coins: 0,
    })
    .select("id, session_number")
    .single();

  if (insertError || !sessionRow) {
    throw new Error(`[createSession] Error al crear sesión: ${insertError?.message}`);
  }

  const sessionId: string = sessionRow.id;
  const sessionNumber: string = sessionRow.session_number;

  // ── 3. Insertar materiales ────────────────────────────────
  const materialsToInsert = data.materials.map((m) => ({
    session_id: sessionId,
    material_type: m.type,
    kg: m.kg,
    observation: m.observation ?? null,
    verified: false,
  }));

  const { error: matError } = await supabase
    .from("session_materials")
    .insert(materialsToInsert);

  if (matError) {
    console.warn("[createSession] Error al insertar materiales:", matError.message);
  }

  // ── 4. Subir evidencias (si las hay) ─────────────────────
  if (data.evidence && data.evidence.length > 0) {
    try {
      await uploadEvidence(sessionId, data.evidence);
    } catch (err) {
      console.warn("[createSession] Error al subir evidencias:", err);
    }
  }

  // ── 5. Calcular y guardar trust score ─────────────────────
  // Delegates to trustScore.ts which loads its own data from Supabase
  // and handles the 'Pendiente de verificación' transition if needed.
  try {
    await calculateAndSaveTrustScore(sessionId);
  } catch (tsErr) {
    console.warn("[createSession] Trust score warning:", tsErr);
  }

  // ── 6. Generar QR Code ────────────────────────────────────
  const qrCode = `QR-SES-${sessionNumber}`;
  await supabase
    .from("recycling_sessions")
    .update({ qr_code: qrCode })
    .eq("id", sessionId);

  // ── 7. Insertar entrada inicial en timeline ───────────────
  await insertTimeline(sessionId, "Borrador", "Usuario");

  // ── 8. Retornar sesión completa ───────────────────────────
  const session = await getSessionById(sessionId);
  if (!session) {
    throw new Error("[createSession] No se pudo recuperar la sesión recién creada.");
  }

  return session;
}

// ────────────────────────────────────────────────────────────
// 4. updateSessionStatus
// ────────────────────────────────────────────────────────────

/**
 * Actualiza el estado de una sesión y registra la entrada
 * en el timeline. Si el nuevo estado es 'Completada', llama
 * a finalizarSesion().
 */
export async function updateSessionStatus(
  sessionId: string,
  newStatus: SessionStatus,
  actor: string,
  note?: string
): Promise<void> {
  const { error } = await supabase
    .from("recycling_sessions")
    .update({ status: newStatus })
    .eq("id", sessionId);

  if (error) {
    throw new Error(`[updateSessionStatus] ${error.message}`);
  }

  // Insertar en timeline (RPC con SECURITY DEFINER)
  await insertTimeline(
    sessionId,
    newStatus,
    actor as "Usuario" | "Operador" | "Sistema",
    note
  );
}

// ────────────────────────────────────────────────────────────
// 5. finalizarSesion
// ────────────────────────────────────────────────────────────

/**
 * Finaliza una sesión verificada por un operador:
 *  1. Actualiza verified_total_kg y eco_coins finales
 *  2. Actualiza perfil del usuario (balance + kg acumulados)
 *  3. Emite recibo Solana (devnet)
 *  4. Actualiza status a 'Completada'
 *  5. Inserta entrada en timeline
 */
export async function finalizarSesion(
  sessionId: string,
  verifiedKg: number,
  operatorId: string
): Promise<void> {
  const finalEcoCoins = Math.floor(verifiedKg / 10);

  // ── 1. Actualizar sesión con datos verificados ────────────
  const { data: sessionData, error: updateError } = await supabase
    .from("recycling_sessions")
    .update({
      verified_total_kg: verifiedKg,
      eco_coins: finalEcoCoins,
      operator_id: operatorId,
      status: "Completada",
    })
    .eq("id", sessionId)
    .select("user_id, session_number")
    .single();

  if (updateError || !sessionData) {
    throw new Error(`[finalizarSesion] Error al actualizar sesión: ${updateError?.message}`);
  }

  // ── 2. Actualizar balance en profiles (RPC para bypassar RLS) ─
  const { error: profileError } = await supabase.rpc("increment_profile_stats", {
    p_user_id: sessionData.user_id,
    p_eco_coins: finalEcoCoins,
    p_kg_recycled: verifiedKg,
  });

  if (profileError) {
    console.warn("[finalizarSesion] increment_profile_stats RPC warning:", profileError.message);
  }

  // ── 3. Emitir recibo Solana ───────────────────────────────
  await emitirReciboSolana(sessionId, sessionData.session_number);

  // ── 4. Insertar en timeline ───────────────────────────────
  await insertTimeline(
    sessionId,
    "Completada",
    "Operador",
    `Verificado: ${verifiedKg} kg → ${finalEcoCoins} ecoCoins`
  );
}

// ────────────────────────────────────────────────────────────
// 6. cancelSession
// ────────────────────────────────────────────────────────────

/**
 * Cancela una sesión. Solo permite cancelar sesiones en estado
 * 'Borrador' o 'Programada'.
 */
export async function cancelSession(
  sessionId: string,
  reason: string
): Promise<void> {
  // Verificar estado actual antes de cancelar
  const { data: current, error: fetchError } = await supabase
    .from("recycling_sessions")
    .select("status")
    .eq("id", sessionId)
    .maybeSingle();

  if (fetchError || !current) {
    throw new Error("[cancelSession] Sesión no encontrada.");
  }

  const cancelableStatuses: SessionStatus[] = ["Borrador", "Programada"];
  if (!cancelableStatuses.includes(current.status as SessionStatus)) {
    throw new Error(
      `[cancelSession] No se puede cancelar una sesión en estado '${current.status}'.`
    );
  }

  const { error } = await supabase
    .from("recycling_sessions")
    .update({
      status: "Cancelada",
      cancellation_reason: reason,
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(`[cancelSession] ${error.message}`);
  }

  await insertTimeline(sessionId, "Cancelada", "Usuario", reason);
}

// ────────────────────────────────────────────────────────────
// 7. getPublicSession
// ────────────────────────────────────────────────────────────

/**
 * Retorna los datos públicos de una sesión para la página
 * /verificar/:id. No expone email ni datos privados del usuario.
 */
export async function getPublicSession(sessionId: string): Promise<PublicSessionData | null> {
  const { data, error } = await supabase
    .from("recycling_sessions")
    .select(`
      session_number,
      status,
      scheduled_date,
      scheduled_time,
      total_kg,
      verified_total_kg,
      eco_coins,
      evidence_hash,
      created_at,
      collection_points (
        name,
        address
      ),
      session_materials (
        material_type,
        kg,
        verified,
        verified_kg
      ),
      solana_receipts (
        signature,
        cluster,
        explorer_url,
        program_id,
        emitted_at
      )
    `)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`[getPublicSession] ${error.message}`);
  }

  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;

  const cp = Array.isArray(d.collection_points) ? d.collection_points[0] : d.collection_points;
  const sr = Array.isArray(d.solana_receipts) ? d.solana_receipts[0] : d.solana_receipts;

  return {
    sessionNumber: d.session_number,
    status: d.status as SessionStatus,
    point: {
      name: cp?.name ?? "Punto desconocido",
      address: cp?.address ?? "",
    },
    scheduledDate: d.scheduled_date ?? undefined,
    scheduledTime: d.scheduled_time ?? undefined,
    totalKg: Number(d.total_kg),
    verifiedTotalKg: d.verified_total_kg != null ? Number(d.verified_total_kg) : undefined,
    ecoCoins: d.eco_coins,
    materials: (d.session_materials ?? []).map(
      (m: { material_type: string; kg: number; verified: boolean; verified_kg: number | null }) => ({
        type: m.material_type as MaterialType,
        kg: Number(m.kg),
        verified: m.verified,
        verifiedKg: m.verified_kg != null ? Number(m.verified_kg) : undefined,
      })
    ),
    evidenceHash: d.evidence_hash ?? undefined,
    solanaReceipt: sr ? mapSolanaReceipt(sr) : undefined,
    createdAt: new Date(d.created_at),
  };
}

// ────────────────────────────────────────────────────────────
// FUNCIONES AUXILIARES ADICIONALES
// ────────────────────────────────────────────────────────────

/** Retorna todas las sesiones para el panel del operador */
export async function getAllSessionsForOperator(): Promise<RecyclingSession[]> {
  const { data, error } = await supabase
    .from("recycling_sessions")
    .select(FULL_SESSION_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`[getAllSessionsForOperator] ${error.message}`);
  }

  return (data as unknown as RawSession[]).map(mapSession);
}

/** Retorna sesiones pendientes de verificación */
export async function getPendingSessionsForOperator(): Promise<RecyclingSession[]> {
  const { data, error } = await supabase
    .from("recycling_sessions")
    .select(FULL_SESSION_SELECT)
    .eq("status", "Pendiente de verificación")
    .order("created_at", { ascending: true }); // FIFO: más antiguas primero

  if (error) {
    throw new Error(`[getPendingSessionsForOperator] ${error.message}`);
  }

  return (data as unknown as RawSession[]).map(mapSession);
}

// ============================================================
//  SQL REQUERIDO: RPCs con SECURITY DEFINER
//  Ejecutar en Supabase SQL Editor ANTES de usar este servicio.
//
//  Estas funciones bypassan el RLS para operaciones de escritura
//  que el cliente autenticado necesita hacer en tablas protegidas.
// ============================================================
/*

-- RPC 1: Insertar en session_timeline
CREATE OR REPLACE FUNCTION public.insert_session_timeline(
  p_session_id UUID,
  p_status     TEXT,
  p_actor      TEXT,
  p_note       TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario tenga acceso a esta sesión
  IF NOT EXISTS (
    SELECT 1 FROM public.recycling_sessions rs
    WHERE rs.id = p_session_id
      AND (
        rs.user_id = auth.uid()
        OR public.is_operator()
      )
  ) THEN
    RAISE EXCEPTION 'Acceso denegado a la sesión %', p_session_id;
  END IF;

  INSERT INTO public.session_timeline (session_id, status, actor, note)
  VALUES (p_session_id, p_status, p_actor, p_note);
END;
$$;

-- RPC 2: Upsert trust_score
CREATE OR REPLACE FUNCTION public.upsert_trust_score(
  p_session_id      UUID,
  p_score           INTEGER,
  p_level           TEXT,
  p_requires_review BOOLEAN,
  p_signals         TEXT  -- JSON string
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trust_scores (
    session_id, score, level, requires_review, signals
  )
  VALUES (
    p_session_id,
    p_score,
    p_level,
    p_requires_review,
    p_signals::JSONB
  )
  ON CONFLICT (session_id)
  DO UPDATE SET
    score           = EXCLUDED.score,
    level           = EXCLUDED.level,
    requires_review = EXCLUDED.requires_review,
    signals         = EXCLUDED.signals,
    calculated_at   = NOW();
END;
$$;

-- RPC 3: Insertar solana_receipt
CREATE OR REPLACE FUNCTION public.insert_solana_receipt(
  p_session_id  UUID,
  p_signature   TEXT,
  p_cluster     TEXT,
  p_explorer_url TEXT,
  p_program_id  TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.solana_receipts (
    session_id, signature, cluster, explorer_url, program_id, status
  )
  VALUES (
    p_session_id, p_signature, p_cluster, p_explorer_url, p_program_id, 'confirmed'
  )
  ON CONFLICT (session_id) DO UPDATE SET
    signature    = EXCLUDED.signature,
    cluster      = EXCLUDED.cluster,
    explorer_url = EXCLUDED.explorer_url,
    program_id   = EXCLUDED.program_id,
    emitted_at   = NOW(),
    status       = 'confirmed';
END;
$$;

-- RPC 4: Incrementar stats de perfil de usuario
CREATE OR REPLACE FUNCTION public.increment_profile_stats(
  p_user_id    UUID,
  p_eco_coins  INTEGER,
  p_kg_recycled DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    eco_coins_balance = eco_coins_balance + p_eco_coins,
    total_kg_recycled = total_kg_recycled + p_kg_recycled,
    updated_at        = NOW()
  WHERE id = p_user_id;
END;
$$;

*/
