// ============================================================
//  EcoTrade — Módulo de Huella de Carbono (Carbon Offset)
//  src/lib/carbonOffset.ts
// ============================================================

import { supabase } from "@/lib/supabase/client";
import type { CarbonOffset, MaterialType } from "@/app/types";

// Factores de conversión internacionales (kg CO2 equivalente por cada kg reciclado)
const CONVERSION_FACTORS: Record<MaterialType, number> = {
  'Plástico': 1.5,
  'Vidrio': 0.3,
  'Papel y cartón': 0.9,
  'Metal': 4.0,
  'Electrónicos (RAEE)': 20.0
};

/**
 * Calcula el impacto ambiental de una sesión, lo guarda en
 * la tabla carbon_footprint_offsets y retorna el objeto de impacto.
 */
export async function calculateAndSaveCarbonOffset(sessionId: string): Promise<CarbonOffset | null> {
  // 1. Obtener la sesión y sus materiales verificados
  const { data: session, error: fetchError } = await supabase
    .from('recycling_sessions')
    .select(`
      user_id,
      session_materials (
        material_type,
        kg,
        verified_kg
      )
    `)
    .eq('id', sessionId)
    .single();

  if (fetchError || !session) {
    console.error('[CarbonOffset] Error cargando sesión para calcular impacto:', fetchError?.message);
    return null;
  }

  // 2. Calcular CO2 evitado
  let totalCo2Avoided = 0;
  const kgByMaterial: Record<string, number> = {};

  const materials = session.session_materials || [];
  
  for (const m of materials) {
    const type = m.material_type as MaterialType;
    // Prioriza kilogramos verificados si existen, sino usa los originales
    const kg = m.verified_kg !== null ? m.verified_kg : m.kg;
    
    if (kg > 0) {
      kgByMaterial[type] = (kgByMaterial[type] || 0) + kg;
      const factor = CONVERSION_FACTORS[type] || 0;
      totalCo2Avoided += kg * factor;
    }
  }

  // 3. Convertir CO2 a árboles equivalentes (Aprox 21 kg CO2 = 1 árbol al año)
  const treesEquivalent = Math.floor(totalCo2Avoided / 21);

  // 4. Guardar mediante RPC (SECURITY DEFINER) para evitar bloqueos por RLS
  const { error: upsertError } = await supabase.rpc('upsert_carbon_offset', {
    p_session_id: sessionId,
    p_user_id: session.user_id,
    p_kg_by_material: JSON.stringify(kgByMaterial),
    p_co2_avoided_kg: parseFloat(totalCo2Avoided.toFixed(3)),
    p_trees_equivalent: treesEquivalent
  });

  if (upsertError) {
    console.error('[CarbonOffset] Error guardando impacto ambiental vía RPC:', upsertError.message);
    // Retornamos el cálculo aunque no se haya persistido
    return {
      co2_avoided_kg: parseFloat(totalCo2Avoided.toFixed(3)),
      trees_equivalent: treesEquivalent,
      kg_by_material: kgByMaterial,
      calculated_at: new Date()
    };
  }

  return {
    co2_avoided_kg: parseFloat(totalCo2Avoided.toFixed(3)),
    trees_equivalent: treesEquivalent,
    kg_by_material: kgByMaterial,
    calculated_at: new Date()
  };
}

/**
 * Obtiene el total histórico de CO2 y árboles para un usuario
 */
export async function getUserTotalOffset(userId: string): Promise<{ totalCo2Kg: number, totalTrees: number }> {
  const { data, error } = await supabase
    .from('carbon_footprint_offsets')
    .select('co2_avoided_kg, trees_equivalent')
    .eq('user_id', userId);

  if (error || !data) {
    console.error('[CarbonOffset] Error obteniendo acumulado de usuario:', error?.message);
    return { totalCo2Kg: 0, totalTrees: 0 };
  }

  let totalCo2Kg = 0;
  let totalTrees = 0;

  for (const row of data) {
    totalCo2Kg += Number(row.co2_avoided_kg || 0);
    totalTrees += Number(row.trees_equivalent || 0);
  }

  return {
    totalCo2Kg: parseFloat(totalCo2Kg.toFixed(3)),
    totalTrees
  };
}
