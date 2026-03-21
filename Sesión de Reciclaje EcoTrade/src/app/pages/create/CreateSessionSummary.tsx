import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../../context/SessionContext';
import { EditorialButton } from '../../components/editorial/EditorialButton';
import { Callout } from '../../components/editorial/Callout';
import { Check, Edit, MapPin, Calendar, Package, Clock, CheckCircle2, ChevronLeft } from 'lucide-react';

const CreateSessionSummary: React.FC = () => {
  const navigate = useNavigate();
  const { draft, getTotalKg, getEstimatedEcoCoins, clearDraft } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if prerequisites are missing
  useEffect(() => {
    if (isSubmitting) return;
    if (!draft.point || !draft.scheduledDate || draft.materials.length === 0) {
      navigate('/crear/punto');
    }
  }, [draft.point, draft.scheduledDate, draft.materials.length, isSubmitting, navigate]);

  if (!draft.point || !draft.scheduledDate || draft.materials.length === 0) {
    return null;
  }

  const totalKg = getTotalKg();
  const estimatedEcoCoins = getEstimatedEcoCoins();

  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    try {
      const { createSession } = await import('@/lib/sessions');
      const session = await createSession({
        collectionPointId: draft.point!.id,
        scheduledDate: draft.scheduledDate,
        scheduledTime: draft.scheduledTime,
        materials: draft.materials.map(m => ({
          type: m.type,
          kg: m.kg,
          observation: m.observation
        })),
        evidence: draft.evidence,
      });

      clearDraft();
      navigate(`/sesion/${session.id}/exito`);
    } catch (error) {
      console.error('Error al crear sesión:', error);
      alert('Hubo un error al crear la sesión. Por favor, intenta de nuevo.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="border-b-4 border-[#1A1A1A] pb-8 mb-12">
        <div className="text-xs uppercase tracking-[0.3em] text-[#4A4A4A] mb-4">
          Paso 5 de 5
        </div>
        <h1 className="mb-4">Confirmar Sesión</h1>
        <p className="text-lg text-[#4A4A4A]">
          Revisa los detalles de tu sesión antes de confirmar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Point summary */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="w-6 h-6 text-[#2D5016] flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-2">
                  Punto de Acopio
                </div>
                <h3 className="mb-1">{draft.point.name}</h3>
                <p className="text-sm text-[#4A4A4A]">{draft.point.address}</p>
              </div>
              <button
                onClick={() => navigate('/crear/punto')}
                className="text-xs uppercase tracking-wider text-[#2D5016] hover:underline"
              >
                Editar
              </button>
            </div>
          </div>

          {/* Schedule summary */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <div className="flex items-start gap-3 mb-4">
              <Calendar className="w-6 h-6 text-[#2D5016] flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-2">
                  Fecha y Horario
                </div>
                <div className="mb-1 font-semibold">
                  {new Date(draft.scheduledDate + 'T00:00:00').toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
                <div className="text-sm text-[#4A4A4A] flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {draft.scheduledTime}
                </div>
              </div>
              <button
                onClick={() => navigate('/crear/fecha')}
                className="text-xs uppercase tracking-wider text-[#2D5016] hover:underline"
              >
                Editar
              </button>
            </div>
          </div>

          {/* Materials summary */}
          <div className="bg-white border-2 border-[#1A1A1A]">
            <div className="p-6 border-b-2 border-[#1A1A1A] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-[#2D5016]" />
                <h3 className="text-sm uppercase tracking-wider">Materiales</h3>
              </div>
              <button
                onClick={() => navigate('/crear/materiales')}
                className="text-xs uppercase tracking-wider text-[#2D5016] hover:underline"
              >
                Editar
              </button>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E8E6DD] bg-[#E8E6DD]">
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-medium">
                    Material
                  </th>
                  <th className="text-right p-4 text-xs uppercase tracking-wider font-medium">
                    Kilogramos
                  </th>
                </tr>
              </thead>
              <tbody>
                {draft.materials.map((material, idx) => (
                  <tr key={idx} className="border-b border-[#E8E6DD]">
                    <td className="p-4">
                      <div className="font-medium">{material.type}</div>
                      {material.observation && (
                        <div className="text-xs text-[#4A4A4A] italic mt-1">
                          {material.observation}
                        </div>
                      )}
                    </td>
                    <td className="text-right p-4 font-medium">
                      {material.kg.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#1A1A1A] bg-[#E8E6DD]">
                  <td className="p-4 font-bold uppercase tracking-wider">
                    Total
                  </td>
                  <td className="text-right p-4 font-bold text-lg">
                    {totalKg.toFixed(1)} KG
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Instructions reminder */}
          {draft.point.instructions && (
            <Callout title="Instrucciones del Punto" variant="info">
              <p className="text-sm">{draft.point.instructions}</p>
            </Callout>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* EcoCoins estimate */}
          <div className="bg-[#E8F4E3] border-2 border-[#2D5016] p-6">
            <div className="text-xs uppercase tracking-wider text-[#2D5016] mb-3">
              ecoCoins Estimados
            </div>
            <div className="text-center py-6 mb-4 border-y-2 border-[#2D5016]">
              <div className="text-6xl font-bold text-[#2D5016] mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                {estimatedEcoCoins}
              </div>
              <div className="text-sm text-[#4A4A4A]">
                {totalKg.toFixed(1)} KG ÷ 10
              </div>
            </div>
            <p className="text-xs text-center text-[#4A4A4A] mb-6">
              Los ecoCoins finales se calcularán después de que el operador verifique 
              los kilogramos exactos en el punto.
            </p>
          </div>

          <Callout title="Al Confirmar" variant="warning">
            <ul className="text-sm space-y-2 list-disc list-inside">
              <li>La sesión quedará en estado <strong>Programada</strong></li>
              <li>Recibirás un código QR para validar la entrega</li>
              <li>Puedes reprogramar o cancelar si es necesario</li>
            </ul>
          </Callout>

          <div className="space-y-3">
            <EditorialButton
              variant="primary"
              size="lg"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>Confirmando...</>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Confirmar Sesión
                </>
              )}
            </EditorialButton>
            <EditorialButton
              variant="outline"
              size="md"
              onClick={() => navigate('/crear/evidencia')}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Volver
            </EditorialButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSessionSummary;