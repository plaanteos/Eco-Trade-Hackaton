import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getReviewDetail, aprobarSesion, solicitarEvidencia, rechazarSesion, ReviewDetailData } from '@/lib/operator';
import { EditorialButton } from '../components/editorial/EditorialButton';
import { TrustScore } from '../components/editorial/TrustScore';
import { Callout } from '../components/editorial/Callout';
import { MapPin, Calendar, Package, AlertTriangle, CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';

const OperatorReviewDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ReviewDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // States for verification
  const [verifiedMaterials, setVerifiedMaterials] = useState<Record<string, number>>({});
  const [operatorNote, setOperatorNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [action, setAction] = useState<'approve' | 'request-evidence' | 'reject' | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const data = await getReviewDetail(id);
        setDetail(data);

        // Prep verification default state
        const initialVerified: Record<string, number> = {};
        data.reportedVsVerified.forEach(m => {
          initialVerified[m.materialId] = m.verifiedKg ?? m.reportedKg;
        });
        setVerifiedMaterials(initialVerified);

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
        <p>Cargando sesión...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h1 className="mb-4">Sesión No Encontrada</h1>
        <EditorialButton variant="primary" onClick={() => navigate('/operador/cola')}>
          Volver a Cola
        </EditorialButton>
      </div>
    );
  }

  const { session, reportedVsVerified } = detail;

  const handleKgChange = (materialId: string, newKg: number) => {
    setVerifiedMaterials(prev => ({
      ...prev,
      [materialId]: newKg
    }));
  };

  const totalReportedKg = session.totalKg;
  const totalVerifiedKg = Object.values(verifiedMaterials).reduce((sum, kg) => sum + kg, 0);
  const verifiedEcoCoins = Math.floor(totalVerifiedKg / 10);

  const handleSubmit = async (selectedAction: 'approve' | 'request-evidence' | 'reject') => {
    if (!id) return;
    setAction(selectedAction);
    setIsSubmitting(true);

    try {
      if (selectedAction === 'approve') {
        const payload = Object.entries(verifiedMaterials).map(([materialId, verifiedKg]) => ({
          materialId,
          verifiedKg,
          verified: true
        }));
        await aprobarSesion(id, payload, operatorNote);
      } else if (selectedAction === 'request-evidence') {
        if (!operatorNote.trim()) {
          alert("Debe escribir una nota solicitando evidencia adicional.");
          return;
        }
        await solicitarEvidencia(id, operatorNote);
      } else {
        if (!operatorNote.trim()) {
          alert("Debe escribir un motivo para rechazar la sesión.");
          return;
        }
        await rechazarSesion(id, operatorNote, 'rechazar');
      }

      navigate('/operador/cola');
    } catch (err) {
      console.error(err);
      alert('Error en la operación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="border-b-4 border-[#1A1A1A] pb-8 mb-12">
        <button
          onClick={() => navigate('/operador/cola')}
          className="flex items-center gap-2 text-sm uppercase tracking-wider text-[#2D5016] hover:underline mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Cola
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-[#4A4A4A] mb-2">
              Revisión de Operador
            </div>
            <h1 className="mb-4">Sesión No. {session.sessionNumber}</h1>
            <div className="text-sm text-[#4A4A4A]">
              ID: {session.id}
            </div>
          </div>
          {session.trustScore && (
            <div className="bg-white border-2 border-[#1A1A1A] p-4">
              <TrustScore trustScore={session.trustScore} compact />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {session.trustScore && (
            <TrustScore trustScore={session.trustScore} />
          )}

          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <h2 className="text-sm uppercase tracking-wider font-bold mb-6 pb-4 border-b-2 border-[#1A1A1A]">
              Información de la Sesión
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#2D5016] flex-shrink-0 mt-1" />
                <div>
                  <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-1">
                    Punto de Acopio
                  </div>
                  <div className="font-bold">{session.point.name}</div>
                  <div className="text-sm text-[#4A4A4A]">{session.point.address}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-[#2D5016] flex-shrink-0 mt-1" />
                <div>
                  <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-1">
                    Fecha Programada
                  </div>
                  <div className="font-bold">
                    {session.scheduledDate && new Date(session.scheduledDate + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  {session.scheduledTime && (
                    <div className="text-sm text-[#4A4A4A]">{session.scheduledTime}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-[#1A1A1A]">
            <div className="p-6 border-b-2 border-[#1A1A1A] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-[#2D5016]" />
                <h2 className="text-sm uppercase tracking-wider font-bold">
                  Comparación: Reportado vs Verificado
                </h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E6DD] bg-[#E8E6DD]">
                    <th className="text-left p-4 text-xs uppercase tracking-wider font-medium">Material</th>
                    <th className="text-right p-4 text-xs uppercase tracking-wider font-medium">Reportado (KG)</th>
                    <th className="text-right p-4 text-xs uppercase tracking-wider font-medium">Verificado (KG)</th>
                    <th className="text-center p-4 text-xs uppercase tracking-wider font-medium">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {reportedVsVerified.map((material, idx) => {
                    const reported = material.reportedKg;
                    const verified = verifiedMaterials[material.materialId] || 0;
                    const diff = verified - reported;
                    const diffPercent = reported > 0 ? (diff / reported) * 100 : 0;
                    
                    return (
                      <tr key={idx} className="border-b border-[#E8E6DD]">
                        <td className="p-4">
                          <div className="font-medium">{material.type}</div>
                        </td>
                        <td className="text-right p-4 font-medium">
                          {reported.toFixed(1)}
                        </td>
                        <td className="p-4">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={verified}
                            onChange={(e) => handleKgChange(material.materialId, parseFloat(e.target.value) || 0)}
                            className="w-24 text-right px-3 py-2 border-2 border-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5016] font-medium ml-auto block"
                          />
                        </td>
                        <td className="text-center p-4">
                          {diff !== 0 && (
                            <span className={`inline-block px-3 py-1 border text-xs font-bold ${
                              diff > 0 
                                ? 'bg-[#E8F4E3] text-[#2D5016] border-[#2D5016]'
                                : 'bg-[#FFE8E8] text-[#B91C1C] border-[#B91C1C]'
                            }`}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(1)} ({diffPercent.toFixed(0)}%)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#1A1A1A] bg-[#E8E6DD]">
                    <td className="p-4 font-bold uppercase tracking-wider">Total</td>
                    <td className="text-right p-4 font-bold text-lg">{totalReportedKg.toFixed(1)}</td>
                    <td className="text-right p-4 font-bold text-lg">{totalVerifiedKg.toFixed(1)}</td>
                    <td className="text-center p-4">
                      {totalVerifiedKg !== totalReportedKg && (
                        <span className={`inline-block px-3 py-1 border text-xs font-bold ${
                          totalVerifiedKg > totalReportedKg
                            ? 'bg-[#E8F4E3] text-[#2D5016] border-[#2D5016]'
                            : 'bg-[#FFE8E8] text-[#B91C1C] border-[#B91C1C]'
                        }`}>
                          {(totalVerifiedKg - totalReportedKg).toFixed(1)}
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <label className="block mb-3 text-sm uppercase tracking-wider font-bold">
              Nota del Operador
            </label>
            <textarea
              value={operatorNote}
              onChange={(e) => setOperatorNote(e.target.value)}
              placeholder="Agrega observaciones, ajustes realizados... Requerido para solicitar evidencia o rechazar."
              rows={4}
              className="w-full px-4 py-3 border-2 border-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5016] resize-none"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#E8F4E3] border-2 border-[#2D5016] p-6">
            <div className="text-xs uppercase tracking-wider text-[#2D5016] mb-4">
              ecoCoins Verificados
            </div>
            <div className="text-center py-6 mb-4 border-y-2 border-[#2D5016]">
              <div className="text-6xl font-bold text-[#2D5016]" style={{ fontFamily: 'var(--font-serif)' }}>
                {verifiedEcoCoins}
              </div>
            </div>
            <div className="text-xs text-center text-[#4A4A4A]">
              {totalVerifiedKg.toFixed(1)} KG ÷ 10
            </div>
          </div>

          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <div className="text-sm uppercase tracking-wider font-bold mb-4">
              Decisión
            </div>

            <div className="space-y-3">
              <EditorialButton
                variant="primary"
                size="lg"
                onClick={() => handleSubmit('approve')}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2"
              >
                {isSubmitting && action === 'approve' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                Aprobar y Emitir en Solana
              </EditorialButton>

              <EditorialButton
                variant="outline"
                size="md"
                onClick={() => handleSubmit('request-evidence')}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2"
              >
                {isSubmitting && action === 'request-evidence' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                Solicitar Evidencia
              </EditorialButton>

              <EditorialButton
                variant="outline"
                size="md"
                onClick={() => handleSubmit('reject')}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 border-[#B91C1C] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white"
              >
                {isSubmitting && action === 'reject' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                Incidencia / Rechazar
              </EditorialButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorReviewDetail;
