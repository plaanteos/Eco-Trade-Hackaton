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
  SessionStatus,
} from "@/app/types";
import {
  CRITICAL_SIGNAL_IDS,
  computeResult,
  computeTrustScore as computeTrustScoreEngine,
  evaluateSignals,
  hasRaeeMaterial,
  parseLimitKg,
  SIGNAL_ID,
  WEIGHTS,
  type EvaluationContext,
} from '@/lib/trustScoreEngine';

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
    public_url: string | null;
  }>;
}

/**
 * Cuenta sesiones previas completadas del usuario.
 * Excluye la sesión actual para no contarse a sí misma.
 */
async function getUserHistoryStats(
  userId: string,
  excludeSessionId: string
): Promise<{ completedCount: number; cancelledCount: number }> {
  const { count: completedCount, error: completedError } = await supabase
    .from("recycling_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "Completada" satisfies SessionStatus)
    .neq("id", excludeSessionId);

  if (completedError) {
    console.warn("[trustScore] Error al contar sesiones completadas previas:", completedError.message);
  }

  const { count: cancelledCount, error: cancelledError } = await supabase
    .from("recycling_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "Cancelada" satisfies SessionStatus)
    .neq("id", excludeSessionId);

  if (cancelledError) {
    console.warn("[trustScore] Error al contar sesiones canceladas previas:", cancelledError.message);
  }

  return {
    completedCount: completedCount ?? 0,
    cancelledCount: cancelledCount ?? 0,
  };
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
        id,
        public_url
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
  const { completedCount, cancelledCount } = await getUserHistoryStats(
    session.user_id,
    sessionId
  );

  // ── 3. Preparar contexto de evaluación ───────────────────
  const acceptedMaterials: string[] = point?.accepted_materials ?? [];
  const limitKg: number = parseLimitKg(point?.limits) ?? 150;
  const totalKg: number = Number(session.total_kg);
  const materialsTotalKg: number = materials.reduce((sum, material) => sum + Number(material.kg), 0);
  const evidenceCount: number = evidence.length;
  const hasRaee: boolean = hasRaeeMaterial(materials);

  const ctx: EvaluationContext = {
    materials,
    evidenceCount,
    acceptedMaterials,
    limitKg,
    totalKg,
    materialsTotalKg,
    completedCount,
    cancelledCount,
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
  return computeTrustScoreEngine(ctx);
}
