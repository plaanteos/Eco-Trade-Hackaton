import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase/client';
import { EditorialButton } from '../components/editorial/EditorialButton';
import { StatusBadge } from '../components/editorial/StatusBadge';
import { Callout } from '../components/editorial/Callout';
import { getSessionById } from '@/lib/sessions';
import { iniciarSesionPresencial, aprobarSesion } from '@/lib/operator';
import { RecyclingSession } from '../types';
import { CheckCircle2, AlertTriangle, Stamp, Loader2 } from 'lucide-react';

const OperatorVerification: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState<RecyclingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [materials, setMaterials] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const s = await getSessionById(id);
        if (s) {
          setSessionData(s);
          setMaterials(s.materials.map(m => ({ ...m, id: m.id || m.type, verified: false, verifiedKg: m.kg })));
          
          if (s.status === 'Programada') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await iniciarSesionPresencial(id, user.id);
              // Optimistically update status
              setSessionData({ ...s, status: 'En curso' as any });
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <Loader2 className="w-12 h-12 mx-auto animate-spin text-[#2D5016] mb-4" />
        <p>Iniciando verificación presencial...</p>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h1 className="mb-4">Sesión No Encontrada</h1>
        <EditorialButton variant="primary" onClick={() => navigate('/historial')}>
          Volver
        </EditorialButton>
      </div>
    );
  }

  const updateMaterialKg = (index: number, kg: number) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], verifiedKg: kg };
    setMaterials(updated);
  };

  const toggleVerified = (index: number) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], verified: !updated[index].verified };
    setMaterials(updated);
  };

  const totalVerifiedKg = materials.reduce((sum, m) => sum + (m.verifiedKg || 0), 0);
  const ecoCoins = Math.floor(totalVerifiedKg / 10);
  const allVerified = materials.every(m => m.verified);

  const handleComplete = async () => {
    if (!id) return;
    setIsCompleting(true);
    try {
      const payload = materials.map(m => ({
        materialId: m.id,
        verifiedKg: m.verifiedKg,
        verified: true
      }));

      await aprobarSesion(id, payload, notes);
      navigate(`/sesion/${id}`);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al aprobar.');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="border-b-4 border-[#1A1A1A] pb-8 mb-12">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-[#4A4A4A] mb-2 flex items-center gap-2">
              <Stamp className="w-4 h-4" />
              Vista de Operador
            </div>
            <h1 className="mb-4">Verificación de Materiales</h1>
            <div className="flex items-center gap-3">
              <span className="text-lg">Sesión No. {sessionData.sessionNumber}</span>
              <StatusBadge status={sessionData.status} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <h3 className="mb-4 pb-3 border-b-2 border-[#1A1A1A] text-sm uppercase tracking-wider">
              Información de la Sesión
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-1">Punto</div>
                <div className="font-medium">{sessionData.point.name}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-1">Fecha</div>
                <div className="font-medium">
                  {sessionData.scheduledDate && new Date(sessionData.scheduledDate).toLocaleDateString('es-ES')}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-1">Horario</div>
                <div className="font-medium">{sessionData.scheduledTime || '-'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-1">Código</div>
                <div className="font-medium font-mono">{sessionData.qrCode}</div>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-[#1A1A1A]">
            <div className="p-6 border-b-2 border-[#1A1A1A]">
              <h3 className="text-sm uppercase tracking-wider">Verificación de Materiales</h3>
              <p className="text-sm text-[#4A4A4A] mt-2">
                Pesa cada material y ajusta los kilogramos verificados. Marca como verificado cuando esté listo.
              </p>
            </div>

            <table className="w-full overflow-x-auto block md:table">
              <thead>
                <tr className="border-b border-[#E8E6DD] bg-[#E8E6DD] text-left">
                  <th className="p-4 text-xs uppercase tracking-wider font-medium">Material</th>
                  <th className="p-4 text-xs uppercase tracking-wider font-medium text-right">Declarado</th>
                  <th className="p-4 text-xs uppercase tracking-wider font-medium text-right">Verificado</th>
                  <th className="p-4 text-xs uppercase tracking-wider font-medium text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material, idx) => (
                  <tr key={idx} className="border-b border-[#E8E6DD]">
                    <td className="p-4">
                      <div className="font-medium">{material.type}</div>
                      {material.observation && (
                        <div className="text-xs text-[#4A4A4A] italic mt-1">
                          {material.observation}
                        </div>
                      )}
                    </td>
                    <td className="text-right p-4 text-[#4A4A4A]">
                      {sessionData.materials[idx].kg.toFixed(1)}
                    </td>
                    <td className="text-right p-4">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={material.verifiedKg || ''}
                        onChange={(e) => updateMaterialKg(idx, parseFloat(e.target.value) || 0)}
                        className="w-24 px-3 py-2 border-2 border-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5016] text-right font-bold"
                      />
                    </td>
                    <td className="text-center p-4">
                      <button
                        onClick={() => toggleVerified(idx)}
                        className={`px-4 py-2 border-2 text-xs uppercase tracking-wider transition-all ${
                          material.verified
                            ? 'bg-[#D1FAE5] text-[#065F46] border-[#065F46]'
                            : 'bg-white text-[#4A4A4A] border-[#4A4A4A] hover:bg-[#E8E6DD]'
                        }`}
                      >
                        {material.verified ? 'Verificado ✓' : 'Verificar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#1A1A1A] bg-[#E8E6DD]">
                  <td colSpan={2} className="p-4 font-bold uppercase tracking-wider">
                    Total Verificado
                  </td>
                  <td className="text-right p-4 font-bold text-lg">
                    {totalVerifiedKg.toFixed(1)} KG
                  </td>
                  <td className="text-center p-4">
                    {allVerified ? (
                      <span className="text-[#065F46] flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-[#92400E] flex items-center justify-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <label className="block mb-3 text-sm uppercase tracking-wider">
              Notas del Operador (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agrega cualquier observación sobre la recepción..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5016] resize-none"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#E8F4E3] border-2 border-[#2D5016] p-6">
            <div className="text-xs uppercase tracking-wider text-[#2D5016] mb-3">
              ecoCoins a Acreditar
            </div>
            <div className="text-center py-6 border-y-2 border-[#2D5016]">
              <div className="text-6xl font-bold text-[#2D5016]" style={{ fontFamily: 'var(--font-serif)' }}>
                {ecoCoins}
              </div>
            </div>
            <div className="text-xs text-center mt-4 text-[#4A4A4A]">
              {totalVerifiedKg.toFixed(1)} KG ÷ 10 = {ecoCoins} ecoCoin{ecoCoins !== 1 ? 's' : ''}
            </div>
          </div>

          {!allVerified && (
            <Callout title="Verificación Pendiente" variant="warning">
              <p className="text-sm">
                Debes marcar todos los materiales como verificados antes de completar la sesión.
              </p>
            </Callout>
          )}

          {materials.some((m, idx) => Math.abs(m.verifiedKg - sessionData.materials[idx].kg) > 0.5) && (
            <Callout title="Diferencias Detectadas" variant="warning">
              <p className="text-sm mb-2">
                Hay diferencias significativas entre los kilogramos declarados y verificados.
              </p>
              <p className="text-xs text-[#4A4A4A]">
                Asegúrate de que los pesos verificados sean correctos antes de completar.
              </p>
            </Callout>
          )}

          <div className="space-y-3">
            <EditorialButton
              variant="primary"
              size="lg"
              onClick={handleComplete}
              disabled={!allVerified || isCompleting}
              className="w-full flex items-center justify-center gap-2"
            >
              {isCompleting ? (
                <>Completando...</>
              ) : (
                <>
                  <Stamp className="w-5 h-5" />
                  Completar Sesión
                </>
              )}
            </EditorialButton>

            <p className="text-xs text-center text-[#4A4A4A]">
              Al completar, se guardará en Solana y se acreditarán {ecoCoins} ecoCoins al usuario
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorVerification;
