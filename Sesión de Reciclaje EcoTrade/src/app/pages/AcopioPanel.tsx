import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ALL_MATERIALS,
  createCenter,
  deleteCenter,
  listMyCenters,
  updateCenter,
  type AcopioCenter,
  type AcopioCenterInput,
} from '@/lib/acopio';

const EMPTY: AcopioCenterInput = {
  name: '',
  address: '',
  schedule: '',
  acceptedMaterials: [],
  instructions: '',
  limits: '',
  isActive: true,
};

const inputCls = 'w-full border-2 border-[#1A1A1A] bg-white px-3 py-2 text-sm';
const labelCls = 'block text-xs uppercase tracking-wider text-[#4A4A4A] mb-1';

const AcopioPanel: React.FC = () => {
  const { user } = useAuth();
  const [centers, setCenters] = useState<AcopioCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AcopioCenterInput | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setCenters(await listMyCenters(user.id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando centros');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY });
  };

  const openEdit = (c: AcopioCenter) => {
    setEditingId(c.id);
    const { id: _id, ...rest } = c;
    setForm(rest);
  };

  const toggleMaterial = (m: AcopioCenterInput['acceptedMaterials'][number]) => {
    if (!form) return;
    const has = form.acceptedMaterials.includes(m);
    setForm({
      ...form,
      acceptedMaterials: has
        ? form.acceptedMaterials.filter((x) => x !== m)
        : [...form.acceptedMaterials, m],
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !user) return;
    if (form.acceptedMaterials.length === 0) {
      setError('Selecciona al menos un material aceptado.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) await updateCenter(editingId, form);
      else await createCenter(user.id, form);
      setForm(null);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando el centro');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: AcopioCenter) => {
    if (!window.confirm(`¿Eliminar "${c.name}"?`)) return;
    try {
      await deleteCenter(c.id);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} (si tiene sesiones asociadas, desactívalo en su lugar)`
          : 'Error eliminando el centro'
      );
    }
  };

  const handleToggleActive = async (c: AcopioCenter) => {
    try {
      const { id: _id, ...rest } = c;
      await updateCenter(c.id, { ...rest, isActive: !c.isActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando el centro');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="border-b-4 border-[#1A1A1A] pb-8 mb-12 flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
            Mis Centros de Acopio
          </h2>
          <p className="text-[#4A4A4A] mt-2">Crea y configura tus centros de acopio.</p>
        </div>
        {!form && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-[#2D5016] text-white px-4 py-3 text-sm uppercase tracking-wider border-2 border-[#1A1A1A]"
          >
            <Plus className="w-4 h-4" /> Nuevo centro
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-6 border-2 border-[#B00020] bg-white p-4 text-sm text-[#B00020]">
          {error}
        </div>
      )}

      {form && (
        <form onSubmit={handleSave} className="bg-white border-2 border-[#1A1A1A] p-6 mb-12 space-y-4">
          <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
            {editingId ? 'Editar centro' : 'Nuevo centro'}
          </h3>
          <div>
            <label className={labelCls}>Nombre</label>
            <input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Dirección</label>
            <input required className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Horario</label>
            <input required className={inputCls} placeholder="Lunes a Viernes 08:00–18:00" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
          </div>
          <div>
            <span className={labelCls}>Materiales aceptados</span>
            <div className="flex flex-wrap gap-4">
              {ALL_MATERIALS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.acceptedMaterials.includes(m)} onChange={() => toggleMaterial(m)} />
                  {m}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Instrucciones</label>
            <textarea rows={3} className={inputCls} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Límites</label>
            <input className={inputCls} placeholder="Máximo 50 kg por visita" value={form.limits} onChange={(e) => setForm({ ...form, limits: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Centro activo (visible para los usuarios)
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-[#2D5016] text-white px-4 py-2 text-sm uppercase tracking-wider border-2 border-[#1A1A1A] disabled:opacity-60">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => { setForm(null); setEditingId(null); }}
              className="px-4 py-2 text-sm uppercase tracking-wider border-2 border-[#1A1A1A]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#2D5016]" /></div>
      ) : centers.length === 0 ? (
        <p className="text-[#4A4A4A]">Aún no has creado centros de acopio.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {centers.map((c) => (
            <div key={c.id} className="bg-white border-2 border-[#1A1A1A] p-6">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>{c.name}</h3>
                <span className={`text-xs uppercase tracking-wider px-2 py-1 border ${c.isActive ? 'border-[#2D5016] text-[#2D5016]' : 'border-[#4A4A4A] text-[#4A4A4A]'}`}>
                  {c.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="flex items-center gap-2 text-sm mt-2"><MapPin className="w-4 h-4" />{c.address}</p>
              <p className="text-sm text-[#4A4A4A] mt-1">{c.schedule}</p>
              <p className="text-sm mt-3">{c.acceptedMaterials.join(' · ')}</p>
              {c.limits && <p className="text-xs text-[#4A4A4A] mt-2">{c.limits}</p>}
              <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(c)} className="flex items-center gap-1 px-3 py-1 text-xs uppercase border-2 border-[#1A1A1A]"><Pencil className="w-3 h-3" />Editar</button>
                <button onClick={() => handleToggleActive(c)} className="px-3 py-1 text-xs uppercase border-2 border-[#1A1A1A]">{c.isActive ? 'Desactivar' : 'Activar'}</button>
                <button onClick={() => handleDelete(c)} className="flex items-center gap-1 px-3 py-1 text-xs uppercase border-2 border-[#B00020] text-[#B00020]"><Trash2 className="w-3 h-3" />Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AcopioPanel;
