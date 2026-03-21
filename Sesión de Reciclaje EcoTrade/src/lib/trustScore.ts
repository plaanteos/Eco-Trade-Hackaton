// ============================================================
//  EcoTrade — Trust Score Module
//  src/lib/trustScore.ts
//
//  Calcula el Trust Score de una sesión de reciclaje a partir
//  de datos reales de Supabase, y lo persiste en trust_scores.
//
//  FUNCIÓN PRINCIPAL:
//    calculateAndSaveTrustScore(sessionId) → Promise<TrustScore>
//
//  SEÑALES EVALUADAS (ponderadas):
//    1. materials-compatible  [critical, 25 pts]
//    2. kg-range              [25 pts]
//    3. evidence-attached     [20 pts]
//    4. user-history          [20 pts]
//    5. raee-evidence         [critical, 15 pts — sólo con RAEE]
//
//  COMPATIBILIDAD: usa las RPCs de supabase/rpcs.sql
// ============================================================

import { supabase } from "@/lib/supabase/client";
import type {
  TrustScore,
  TrustSignal,
  TrustLevel,
  MaterialType,
  SessionStatus,
} from "@/app/types";

// ─── Constantes de señales ───────────────────────────────────

const SIGNAL_ID = {
  MATERIALS_COMPATIBLE: "materials-compatible",
  KG_RANGE:             "kg-range",
  EVIDENCE_ATTACHED:    "evidence-attached",
  USER_HISTORY:         "user-history",
  RAEE_EVIDENCE:        "raee-evidence",
} as const;

/** Peso de cada señal en puntos absolutos */
const WEIGHTS: Record<string, number> = {
  [SIGNAL_ID.MATERIALS_COMPATIBLE]: 25,
  [SIGNAL_ID.KG_RANGE]:             25,
  [SIGNAL_ID.EVIDENCE_ATTACHED]:    20,
  [SIGNAL_ID.USER_HISTORY]:         20,
  [SIGNAL_ID.RAEE_EVIDENCE]:        15,
};

/** Señales que, si fallan, obligan revisión independientemente del score */
const CRITICAL_SIGNAL_IDS = new Set<string>([
  SIGNAL_ID.MATERIALS_COMPATIBLE,
  SIGNAL_ID.RAEE_EVIDENCE,
]);

// ─── Tipo interno: datos cargados desde Supabase ─────────────

interface SessionData {
  id: string;
  user_id: string;
  status: string;
  total_kg: number;
  collection_points: {
    accepted_materials: string[];
    limits: string | null;
  } | null;
  session_materials: Array<{
    material_type: string;
    kg: number;
  }>;
  session_evidence: Array<{
    id: string;
  }>;
}

// ─── Utilidades ──────────────────────────────────────────────

/**
 * Extrae el límite numérico de KG del campo `limits` del punto
 * de acopio parseando texto como "Máximo 50 kg por visita."
 * Retorna `null` si no se encuentra un valor numérico.
 */
function parseLimitKg(limitsText: string | null | undefined): number | null {
  if (!limitsText) return null;
  // Buscar el primer número que aparezca junto a "kg" en el texto
  const match = limitsText.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
  if (!match) return null;
  const value = parseFloat(match[1].replace(",", "."));
  return isNaN(value) ? null : value;
}

/**
 * Cuenta sesiones previas completadas del usuario.
 * Excluye la sesión actual para no contarse a sí misma.
 */
async function countCompletedSessions(
  userId: string,
  excludeSessionId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("recycling_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "Completada" satisfies SessionStatus)
    .neq("id", excludeSessionId);

  if (error) {
    console.warn("[trustScore] Error al contar sesiones previas:", error.message);
    return 0;
  }
  return count ?? 0;
}

// ─── Motor de evaluación de señales ─────────────────────────

interface EvaluationContext {
  materials:          SessionData["session_materials"];
  evidenceCount:      number;
  acceptedMaterials:  string[];
  limitKg:            number;       // límite del punto (default 150)
  totalKg:            number;
  completedCount:     number;       // sesiones previas completadas
  hasRaee:            boolean;
}

/**
 * Evalúa las cinco señales y retorna el array de TrustSignal.
 * La señal `raee-evidence` sólo se incluye cuando hay RAEE.
 */
function evaluateSignals(ctx: EvaluationContext): TrustSignal[] {
  const signals: TrustSignal[] = [];

  // ── SEÑAL 1: materials-compatible (critical, 25 pts) ─────
  const incompatible = ctx.materials.filter(
    (m) => !ctx.acceptedMaterials.includes(m.material_type)
  );
  signals.push({
    id: SIGNAL_ID.MATERIALS_COMPATIBLE,
    label: "Materiales compatibles con el punto de acopio",
    passed: incompatible.length === 0,
    critical: true,
  });

  // ── SEÑAL 2: kg-range (25 pts) ──────────────────────────
  const kg = ctx.totalKg;
  const kgInRange = kg > 0 && kg <= ctx.limitKg;
  const kgSuspicious = kg > 100; // sospechoso pero no crítico
  signals.push({
    id: SIGNAL_ID.KG_RANGE,
    label: kgSuspicious
      ? `Volumen declarado (${kg} kg) superior a 100 kg — requiere revisión`
      : `Volumen dentro del rango permitido (≤ ${ctx.limitKg} kg)`,
    passed: kgInRange && !kgSuspicious,
    critical: false,
  });

  // ── SEÑAL 3: evidence-attached (20 pts) ─────────────────
  signals.push({
    id: SIGNAL_ID.EVIDENCE_ATTACHED,
    label: "Al menos una evidencia fotográfica adjunta",
    passed: ctx.evidenceCount >= 1,
    critical: false,
  });

  // ── SEÑAL 4: user-history (20 pts) ──────────────────────
  // Si es el primer reciclaje del usuario → peso neutro
  // (se marca como "N/A" con passed=true para no restar)
  const isFirstRecycling = ctx.completedCount === 0;
  signals.push({
    id: SIGNAL_ID.USER_HISTORY,
    label: isFirstRecycling
      ? "Primer reciclaje del usuario (historial neutro)"
      : `Usuario con ${ctx.completedCount} sesión${ctx.completedCount > 1 ? "es" : ""} previa${ctx.completedCount > 1 ? "s" : ""} completada${ctx.completedCount > 1 ? "s" : ""}`,
    passed: isFirstRecycling || ctx.completedCount >= 1,
    critical: false,
  });

  // ── SEÑAL 5: raee-evidence (critical, 15 pts) ─────────
  // Solo se evalúa cuando hay materiales RAEE
  if (ctx.hasRaee) {
    signals.push({
      id: SIGNAL_ID.RAEE_EVIDENCE,
      label: "Mínimo 2 evidencias adjuntas para materiales RAEE",
      passed: ctx.evidenceCount >= 2,
      critical: true,
    });
  }

  return signals;
}

/**
 * Calcula el score ponderado y determina level + requiresReview.
 */
function computeResult(signals: TrustSignal[]): TrustScore {
  // Solo contar señales que tienen peso definido
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const signal of signals) {
    const weight = WEIGHTS[signal.id] ?? 0;
    totalWeight += weight;
    if (signal.passed) earnedWeight += weight;
  }

  const score =
    totalWeight === 0 ? 100 : Math.round((earnedWeight / totalWeight) * 100);

  let level: TrustLevel;
  if (score >= 80) level = "Alta";
  else if (score >= 50) level = "Media";
  else level = "Baja";

  const criticalFailed = signals.some(
    (s) => CRITICAL_SIGNAL_IDS.has(s.id) && !s.passed
  );

  const requiresReview = criticalFailed || level === "Baja";

  return { score, level, signals, requiresReview };
}

// ─── Persistencia ────────────────────────────────────────────

/** Llama a la RPC `upsert_trust_score` (SECURITY DEFINER en rpcs.sql). */
async function persistTrustScore(
  sessionId: string,
  ts: TrustScore
): Promise<void> {
  const { error } = await supabase.rpc("upsert_trust_score", {
    p_session_id:      sessionId,
    p_score:           ts.score,
    p_level:           ts.level,
    p_requires_review: ts.requiresReview,
    p_signals:         JSON.stringify(ts.signals),
  });

  if (error) {
    console.warn("[trustScore] upsert_trust_score RPC warning:", error.message);
  }
}

/**
 * Si el Trust Score requiere revisión, actualiza el status de la
 * sesión a 'Pendiente de verificación' e inserta una entrada en
 * session_timeline con actor 'Sistema'.
 */
async function markForReviewIfNeeded(
  sessionId: string,
  ts: TrustScore
): Promise<void> {
  if (!ts.requiresReview) return;

  // Actualizar status
  const { error: statusError } = await supabase
    .from("recycling_sessions")
    .update({ status: "Pendiente de verificación" satisfies SessionStatus })
    .eq("id", sessionId)
    // Solo aplicar si está en un estado "editable" (no ya completada/cancelada)
    .in("status", [
      "Borrador",
      "Programada",
      "En curso",
    ] satisfies SessionStatus[]);

  if (statusError) {
    console.warn("[trustScore] Error al actualizar status:", statusError.message);
  }

  // Insertar entrada en timeline via RPC
  const note =
    `Confianza ${ts.level.toLowerCase()} (score: ${ts.score}/100): ` +
    "requiere revisión antes de emitir on-chain";

  const { error: timelineError } = await supabase.rpc(
    "insert_session_timeline",
    {
      p_session_id: sessionId,
      p_status:     "Pendiente de verificación",
      p_actor:      "Sistema",
      p_note:       note,
    }
  );

  if (timelineError) {
    console.warn(
      "[trustScore] insert_session_timeline RPC warning:",
      timelineError.message
    );
  }
}

// ════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL EXPORTADA
// ════════════════════════════════════════════════════════════

/**
 * Carga la sesión desde Supabase, evalúa las 5 señales con
 * pesos ponderados, persiste el resultado, y si requiresReview
 * actualiza el status a 'Pendiente de verificación'.
 *
 * @param sessionId UUID de la sesión a evaluar
 * @returns TrustScore completo con signals, score, level y requiresReview
 * @throws Error si la sesión no existe o no hay acceso
 */
export async function calculateAndSaveTrustScore(
  sessionId: string
): Promise<TrustScore> {
  // ── 1. Cargar datos de la sesión ─────────────────────────
  const { data: raw, error: fetchError } = await supabase
    .from("recycling_sessions")
    .select(`
      id,
      user_id,
      status,
      total_kg,
      collection_points (
        accepted_materials,
        limits
      ),
      session_materials (
        material_type,
        kg
      ),
      session_evidence (
        id
      )
    `)
    .eq("id", sessionId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`[calculateAndSaveTrustScore] Error al cargar sesión: ${fetchError.message}`);
  }

  if (!raw) {
    throw new Error(`[calculateAndSaveTrustScore] Sesión no encontrada: ${sessionId}`);
  }

  const session = raw as unknown as SessionData;

  // Supabase puede devolver el join como array o como objeto; normalizamos
  const point = Array.isArray(session.collection_points)
    ? session.collection_points[0] ?? null
    : session.collection_points;

  const materials = session.session_materials ?? [];
  const evidence  = session.session_evidence  ?? [];

  // ── 2. Contar sesiones completadas previas del usuario ───
  const completedCount = await countCompletedSessions(
    session.user_id,
    sessionId
  );

  // ── 3. Preparar contexto de evaluación ───────────────────
  const acceptedMaterials: string[] = point?.accepted_materials ?? [];
  const limitKg: number = parseLimitKg(point?.limits) ?? 150;
  const totalKg: number = Number(session.total_kg);
  const evidenceCount: number = evidence.length;
  const hasRaee: boolean = materials.some(
    (m) => m.material_type === ("Electrónicos (RAEE)" satisfies MaterialType)
  );

  const ctx: EvaluationContext = {
    materials,
    evidenceCount,
    acceptedMaterials,
    limitKg,
    totalKg,
    completedCount,
    hasRaee,
  };

  // ── 4. Evaluar señales ────────────────────────────────────
  const signals  = evaluateSignals(ctx);
  const trustScore = computeResult(signals);

  // ── 5. Persistir en trust_scores ─────────────────────────
  await persistTrustScore(sessionId, trustScore);

  // ── 6. Marcar para revisión si aplica ────────────────────
  await markForReviewIfNeeded(sessionId, trustScore);

  return trustScore;
}

// ════════════════════════════════════════════════════════════
// getTrustScore — solo lectura desde DB
// ════════════════════════════════════════════════════════════

/**
 * Lee el trust_score persistido de una sesión desde Supabase.
 * Retorna null si aún no ha sido calculado.
 *
 * @param sessionId UUID de la sesión
 */
export async function getTrustScore(
  sessionId: string
): Promise<TrustScore | null> {
  const { data, error } = await supabase
    .from("trust_scores")
    .select("score, level, requires_review, signals")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`[getTrustScore] ${error.message}`);
  }

  if (!data) return null;

  return {
    score:          data.score,
    level:          data.level as TrustLevel,
    requiresReview: data.requires_review,
    signals:        data.signals as TrustSignal[],
  };
}

// ════════════════════════════════════════════════════════════
// formatTrustSignals — utilidad de presentación
// ════════════════════════════════════════════════════════════

/**
 * Separa las señales en aprobadas y rechazadas para facilitar
 * el renderizado en los componentes de UI.
 *
 * @param signals Array de TrustSignal
 * @returns { passed: TrustSignal[], failed: TrustSignal[] }
 */
export function formatTrustSignals(signals: TrustSignal[]): {
  passed: TrustSignal[];
  failed:  TrustSignal[];
} {
  return {
    passed: signals.filter((s) => s.passed),
    failed:  signals.filter((s) => !s.passed),
  };
}

// ════════════════════════════════════════════════════════════
// Exportaciones adicionales (útiles para tests y UI)
// ════════════════════════════════════════════════════════════

export { SIGNAL_ID, WEIGHTS, CRITICAL_SIGNAL_IDS };
export type { EvaluationContext };

/**
 * Versión pura (sync) del motor, sin acceso a Supabase.
 * Útil para tests unitarios o previsualizaciones en UI.
 *
 * @param ctx Contexto de evaluación ya construido
 * @returns TrustScore calculado
 */
export function computeTrustScore(ctx: EvaluationContext): TrustScore {
  const signals = evaluateSignals(ctx);
  return computeResult(signals);
}
