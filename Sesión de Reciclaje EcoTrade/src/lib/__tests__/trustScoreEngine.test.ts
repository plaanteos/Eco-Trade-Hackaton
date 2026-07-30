import { describe, expect, it } from 'vitest';

import { computeTrustScore, parseLimitKg } from '@/lib/trustScoreEngine';

describe('trustScoreEngine', () => {
  it('marca revisión cuando el total declarado no coincide con el detalle de materiales', () => {
    const result = computeTrustScore({
      materials: [{ material_type: 'Plástico', kg: 12 }],
      evidenceCount: 1,
      acceptedMaterials: ['Plástico'],
      limitKg: 150,
      totalKg: 15,
      materialsTotalKg: 12,
      completedCount: 2,
      cancelledCount: 0,
      hasRaee: false,
    });

    expect(result.requiresReview).toBe(true);
    expect(result.level).toBe('Media');
    expect(result.signals.find((signal) => signal.id === 'materials-compatible')?.passed).toBe(false);
  });

  it('exige evidencia reforzada cuando hay RAEE', () => {
    const result = computeTrustScore({
      materials: [{ material_type: 'Electrónicos (RAEE)', kg: 8 }],
      evidenceCount: 1,
      acceptedMaterials: ['Electrónicos (RAEE)'],
      limitKg: 150,
      totalKg: 8,
      materialsTotalKg: 8,
      completedCount: 3,
      cancelledCount: 0,
      hasRaee: true,
    });

    expect(result.requiresReview).toBe(true);
    expect(result.signals.find((signal) => signal.id === 'raee-evidence')?.passed).toBe(false);
  });

  it('penaliza historiales con más cancelaciones que sesiones completadas', () => {
    const result = computeTrustScore({
      materials: [{ material_type: 'Metal', kg: 20 }],
      evidenceCount: 2,
      acceptedMaterials: ['Metal'],
      limitKg: 150,
      totalKg: 20,
      materialsTotalKg: 20,
      completedCount: 1,
      cancelledCount: 3,
      hasRaee: false,
    });

    expect(result.signals.find((signal) => signal.id === 'user-history')?.passed).toBe(false);
    expect(result.score).toBeLessThan(100);
  });

  it('devuelve alta confianza para una sesión sana', () => {
    const result = computeTrustScore({
      materials: [{ material_type: 'Vidrio', kg: 12 }],
      evidenceCount: 2,
      acceptedMaterials: ['Vidrio', 'Plástico'],
      limitKg: 150,
      totalKg: 12,
      materialsTotalKg: 12,
      completedCount: 4,
      cancelledCount: 0,
      hasRaee: false,
    });

    expect(result.requiresReview).toBe(false);
    expect(result.level).toBe('Alta');
    expect(result.score).toBe(100);
  });

  it('parsea correctamente límites de kilogramos en texto libre', () => {
    expect(parseLimitKg('Máximo 50 kg por visita.')).toBe(50);
    expect(parseLimitKg('Hasta 12,5 kg por entrega')).toBe(12.5);
    expect(parseLimitKg('Sin límite declarado')).toBeNull();
  });
});