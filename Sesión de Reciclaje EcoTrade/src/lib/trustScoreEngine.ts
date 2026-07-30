import type { MaterialType, TrustLevel, TrustScore, TrustSignal } from '@/app/types';

export const SIGNAL_ID = {
  MATERIALS_COMPATIBLE: 'materials-compatible',
  KG_RANGE: 'kg-range',
  EVIDENCE_ATTACHED: 'evidence-attached',
  USER_HISTORY: 'user-history',
  RAEE_EVIDENCE: 'raee-evidence',
} as const;

export const WEIGHTS: Record<string, number> = {
  [SIGNAL_ID.MATERIALS_COMPATIBLE]: 25,
  [SIGNAL_ID.KG_RANGE]: 25,
  [SIGNAL_ID.EVIDENCE_ATTACHED]: 20,
  [SIGNAL_ID.USER_HISTORY]: 20,
  [SIGNAL_ID.RAEE_EVIDENCE]: 15,
};

export const CRITICAL_SIGNAL_IDS = new Set<string>([
  SIGNAL_ID.MATERIALS_COMPATIBLE,
  SIGNAL_ID.RAEE_EVIDENCE,
]);

export interface EvaluationContext {
  materials: Array<{
    material_type: string;
    kg: number;
  }>;
  evidenceCount: number;
  acceptedMaterials: string[];
  limitKg: number;
  totalKg: number;
  materialsTotalKg: number;
  completedCount: number;
  cancelledCount: number;
  hasRaee: boolean;
}

export function parseLimitKg(limitsText: string | null | undefined): number | null {
  if (!limitsText) return null;
  const match = limitsText.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
  if (!match) return null;
  const value = parseFloat(match[1].replace(',', '.'));
  return Number.isNaN(value) ? null : value;
}

export function evaluateSignals(ctx: EvaluationContext): TrustSignal[] {
  const signals: TrustSignal[] = [];

  const incompatible = ctx.materials.filter(
    (material) => !ctx.acceptedMaterials.includes(material.material_type)
  );
  const hasMaterials = ctx.materials.length > 0;
  const materialTotalsMatch = Math.abs(ctx.materialsTotalKg - ctx.totalKg) < 0.01;

  signals.push({
    id: SIGNAL_ID.MATERIALS_COMPATIBLE,
    label: hasMaterials
      ? materialTotalsMatch
        ? 'Materiales compatibles y total declarado consistente'
        : `Materiales compatibles pero el total declarado (${ctx.totalKg} kg) no coincide con el detalle (${ctx.materialsTotalKg} kg)`
      : 'La sesión debe declarar al menos un material compatible con el punto',
    passed: hasMaterials && incompatible.length === 0 && materialTotalsMatch,
    critical: true,
  });

  const kgInRange = ctx.totalKg > 0 && ctx.totalKg <= ctx.limitKg;
  const kgSuspicious = ctx.totalKg > 100;
  signals.push({
    id: SIGNAL_ID.KG_RANGE,
    label: kgSuspicious
      ? `Volumen declarado (${ctx.totalKg} kg) superior a 100 kg — requiere revisión`
      : `Volumen dentro del rango permitido (≤ ${ctx.limitKg} kg)`,
    passed: kgInRange && !kgSuspicious,
    critical: false,
  });

  signals.push({
    id: SIGNAL_ID.EVIDENCE_ATTACHED,
    label: 'Al menos una evidencia fotográfica adjunta',
    passed: ctx.evidenceCount >= 1,
    critical: false,
  });

  const isFirstRecycling = ctx.completedCount === 0;
  const historyLooksHealthy = ctx.cancelledCount === 0 || ctx.completedCount >= ctx.cancelledCount;
  signals.push({
    id: SIGNAL_ID.USER_HISTORY,
    label: isFirstRecycling
      ? 'Primer reciclaje del usuario (historial neutro)'
      : ctx.cancelledCount > 0
        ? `Historial del usuario: ${ctx.completedCount} completada(s) y ${ctx.cancelledCount} cancelada(s)`
        : `Usuario con ${ctx.completedCount} sesión${ctx.completedCount > 1 ? 'es' : ''} previa${ctx.completedCount > 1 ? 's' : ''} completada${ctx.completedCount > 1 ? 's' : ''}`,
    passed: isFirstRecycling || historyLooksHealthy,
    critical: false,
  });

  if (ctx.hasRaee) {
    signals.push({
      id: SIGNAL_ID.RAEE_EVIDENCE,
      label: 'Mínimo 2 evidencias adjuntas para materiales RAEE',
      passed: ctx.evidenceCount >= 2,
      critical: true,
    });
  }

  return signals;
}

export function computeResult(signals: TrustSignal[]): TrustScore {
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const signal of signals) {
    const weight = WEIGHTS[signal.id] ?? 0;
    totalWeight += weight;
    if (signal.passed) earnedWeight += weight;
  }

  const score = totalWeight === 0 ? 100 : Math.round((earnedWeight / totalWeight) * 100);

  let level: TrustLevel;
  if (score >= 80) level = 'Alta';
  else if (score >= 50) level = 'Media';
  else level = 'Baja';

  const criticalFailed = signals.some((signal) => CRITICAL_SIGNAL_IDS.has(signal.id) && !signal.passed);
  const requiresReview = criticalFailed || level === 'Baja';

  return { score, level, signals, requiresReview };
}

export function computeTrustScore(ctx: EvaluationContext): TrustScore {
  return computeResult(evaluateSignals(ctx));
}

export function hasRaeeMaterial(materials: Array<{ material_type: string }>): boolean {
  return materials.some(
    (material) => material.material_type === ('Electrónicos (RAEE)' satisfies MaterialType)
  );
}