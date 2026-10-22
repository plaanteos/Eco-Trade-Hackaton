import { supabase } from '@/lib/supabase/client';
import type { MaterialType } from '@/app/types';

export const ALL_MATERIALS: MaterialType[] = [
  'Plástico',
  'Vidrio',
  'Papel y cartón',
  'Metal',
  'Electrónicos (RAEE)',
];

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;

export const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  return `${h}:${i % 2 ? '30' : '00'}`;
});

export type DaySchedule = Record<string, { from: string; to: string }>;

// Formato guardado: "Lunes 08:00–18:00 | Martes 09:00–14:00"
export function parseSchedule(text: string): DaySchedule {
  const out: DaySchedule = {};
  for (const part of text.split('|')) {
    const m = part.trim().match(/^(\S+) (\d{2}:\d{2})–(\d{2}:\d{2})$/);
    if (m && (DAYS as readonly string[]).includes(m[1])) out[m[1]] = { from: m[2], to: m[3] };
  }
  return out;
}

export function serializeSchedule(s: DaySchedule): string {
  return DAYS.filter((d) => s[d]).map((d) => `${d} ${s[d].from}–${s[d].to}`).join(' | ');
}

export interface AcopioCenter {
  id: string;
  name: string;
  address: string;
  schedule: string;
  acceptedMaterials: MaterialType[];
  instructions: string;
  limits: string;
  isActive: boolean;
}

export type AcopioCenterInput = Omit<AcopioCenter, 'id'>;

interface Row {
  id: string;
  name: string;
  address: string;
  schedule: string;
  accepted_materials: MaterialType[] | null;
  instructions: string | null;
  limits: string | null;
  is_active: boolean;
}

const map = (r: Row): AcopioCenter => ({
  id: r.id,
  name: r.name,
  address: r.address,
  schedule: r.schedule,
  acceptedMaterials: r.accepted_materials ?? [],
  instructions: r.instructions ?? '',
  limits: r.limits ?? '',
  isActive: r.is_active,
});

const toRow = (c: AcopioCenterInput) => ({
  name: c.name.trim(),
  address: c.address.trim(),
  schedule: c.schedule.trim(),
  accepted_materials: c.acceptedMaterials,
  instructions: c.instructions.trim() || null,
  limits: c.limits.trim() || null,
  is_active: c.isActive,
});

export async function listMyCenters(ownerId: string): Promise<AcopioCenter[]> {
  const { data, error } = await supabase
    .from('collection_points')
    .select('id, name, address, schedule, accepted_materials, instructions, limits, is_active')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Row[]).map(map);
}

export async function createCenter(ownerId: string, input: AcopioCenterInput): Promise<void> {
  const { error } = await supabase
    .from('collection_points')
    .insert({ ...toRow(input), owner_id: ownerId });
  if (error) throw new Error(error.message);
}

export async function updateCenter(id: string, input: AcopioCenterInput): Promise<void> {
  const { error } = await supabase.from('collection_points').update(toRow(input)).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCenter(id: string): Promise<void> {
  const { error } = await supabase.from('collection_points').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
