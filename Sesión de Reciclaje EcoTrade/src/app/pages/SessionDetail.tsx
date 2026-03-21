import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { EditorialButton } from '../components/editorial/EditorialButton';
import { StatusBadge } from '../components/editorial/StatusBadge';
import { Timeline } from '../components/editorial/Timeline';
import { Callout } from '../components/editorial/Callout';
import { SolanaReceipt } from '../components/editorial/SolanaReceipt';
import { TrustScore } from '../components/editorial/TrustScore';
import { EvidenceHash } from '../components/editorial/EvidenceHash';
import { CarbonImpactBadge } from '../components/editorial/CarbonImpactBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { MapPin, Calendar, Clock, Package, Download, XCircle, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { getSessionById, cancelSession as apiCancelSession } from '@/lib/sessions';
import { RecyclingSession } from '@/app/types';
import { useAuth } from '../context/AuthContext';

const SessionDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isOperador = role === 'Operador';
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  
  const [session, setSession] = useState<RecyclingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSession = useCallback(async (opts?: { silent?: boolean }) => {
    if (!id) return;
    const silent = opts?.silent === true;
    try {
      if (silent) setIsRefreshing(true);
      else setIsLoading(true);
      const s = await getSessionById(id);
      setSession(s);
    } catch (err) {
      console.error(err);
    } finally {
      if (silent) setIsRefreshing(false);
      else setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <Loader2 className="w-12 h-12 mx-auto animate-spin text-[#2D5016] mb-4" />
        <p>Cargando sesión...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h1 className="mb-4">Sesión No Encontrada</h1>
        <EditorialButton variant="primary" onClick={() => navigate('/historial')}>
          Volver al Historial
        </EditorialButton>
      </div>
    );
  }

  const canCancel = session.status === 'Borrador' || session.status === 'Programada';

  const handleCancel = async () => {
    if (cancellationReason.trim() && id) {
      try {
        await apiCancelSession(id, cancellationReason);
        setShowCancelDialog(false);
        navigate('/historial');
      } catch (err) {
        console.error('Error cancelando sesión:', err);
        alert('Hubo un error al cancelar la sesión.');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="border-b-4 border-[#1A1A1A] pb-8 mb-12">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-[#4A4A4A] mb-2">
              Sesión de Reciclaje
            </div>
            <h1 className="mb-4">No. {session.sessionNumber}</h1>
            <StatusBadge status={session.status} />
          </div>
          <div className="flex gap-3">
            {session.status === 'Completada' && (
              <EditorialButton variant="outline" size="md" onClick={() => window.print()}>
                <Download className="w-4 h-4 mr-2" />
                Imprimir Recibo
              </EditorialButton>
            )}
            {canCancel && (
              <EditorialButton 
                variant="outline" 
                size="md"
                onClick={() => setShowCancelDialog(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancelar
              </EditorialButton>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Point info */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="w-6 h-6 text-[#2D5016] flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-2">
                  Punto de Acopio
                </div>
                <h3 className="mb-1">{session.point.name}</h3>
                <p className="text-sm text-[#4A4A4A] mb-3">{session.point.address}</p>
                <div className="flex items-center gap-2 text-sm text-[#4A4A4A]">
                  <Clock className="w-4 h-4" />
                  {session.point.schedule}
                </div>
              </div>
            </div>

            {session.point.instructions && (
              <div className="mt-4 pt-4 border-t border-[#E8E6DD]">
                <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-2">
                  Instrucciones
                </div>
                <p className="text-sm">{session.point.instructions}</p>
              </div>
            )}
          </div>

          {/* Schedule */}
          {session.scheduledDate && (
            <div className="bg-white border-2 border-[#1A1A1A] p-6">
              <div className="flex items-start gap-3">
                <Calendar className="w-6 h-6 text-[#2D5016] flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-2">
                    Fecha Programada
                  </div>
                  <div className="mb-1 font-semibold text-lg">
                    {new Date(session.scheduledDate + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-sm text-[#4A4A4A] flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {session.scheduledTime}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Materials */}
          <div className="bg-white border-2 border-[#1A1A1A]">
            <div className="p-6 border-b-2 border-[#1A1A1A] flex items-center gap-3">
              <Package className="w-6 h-6 text-[#2D5016]" />
              <h3 className="text-sm uppercase tracking-wider">Materiales Registrados</h3>
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
                  {session.status === 'Completada' && (
                    <th className="text-center p-4 text-xs uppercase tracking-wider font-medium">
                      Estado
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {session.materials.map((material, idx) => (
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
                    {session.status === 'Completada' && (
                      <td className="text-center p-4">
                        {material.verified && (
                          <span className="inline-block px-3 py-1 bg-[#D1FAE5] text-[#065F46] border border-[#065F46] text-xs uppercase tracking-wider">
                            Verificado
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#1A1A1A] bg-[#E8E6DD]">
                  <td className="p-4 font-bold uppercase tracking-wider">
                    Total
                  </td>
                  <td className="text-right p-4 font-bold text-lg" colSpan={session.status === 'Completada' ? 2 : 1}>
                    {session.totalKg.toFixed(1)} KG
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Evidencia Fotográfica */}
          {session.evidence && session.evidence.length > 0 && (
            <div className="bg-white border-2 border-[#1A1A1A]">
              <div className="p-6 border-b-2 border-[#1A1A1A]">
                <h3 className="text-sm uppercase tracking-wider">Evidencia Fotográfica</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {session.evidence.map((url, idx) => (
                    <div key={idx} className="border-2 border-[#1A1A1A] p-1 bg-white aspect-square overflow-hidden group">
                      <img 
                        src={url} 
                        alt={`Evidencia ${idx + 1}`} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110 cursor-zoom-in"
                        onClick={() => window.open(url, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* On-chain pending (completed but no receipt yet) */}
          {session.status === 'Completada' && !session.solanaReceipt && (
            <Callout title="Recibo On-Chain" variant="warning">
              <p className="text-sm mb-4">
                La sesión ya fue completada, pero el recibo en Solana aún no aparece.
                Esto puede tardar unos segundos si se está confirmando la transacción.
              </p>
              <EditorialButton
                variant="outline"
                size="md"
                onClick={() => loadSession({ silent: true })}
                disabled={isRefreshing}
                className="w-full"
              >
                {isRefreshing ? 'Actualizando…' : 'Actualizar'}
              </EditorialButton>
            </Callout>
          )}

          {/* Solana Receipt (only for completed sessions) */}
          {session.status === 'Completada' && session.solanaReceipt && (
            <>
              <SolanaReceipt 
                receipt={session.solanaReceipt}
                sessionNumber={session.sessionNumber}
                totalKg={session.verifiedTotalKg || session.totalKg}
                ecoCoins={session.ecoCoins}
              />

              {/* Carbon Impact Badge */}
              {session.carbonOffset && (
                <div className="mt-4">
                  <CarbonImpactBadge 
                    co2Kg={session.carbonOffset.co2_avoided_kg} 
                    trees={session.carbonOffset.trees_equivalent} 
                    className="w-full justify-center"
                  />
                </div>
              )}

              {/* Botones de Acción para recibo */}
              <div className="mt-8 flex flex-col md:flex-row gap-4">
                <EditorialButton 
                  variant="primary" 
                  size="lg"
                  className="flex-1 flex items-center justify-center gap-2"
                  onClick={() => window.open(session.solanaReceipt?.explorerUrl, '_blank')}
                >
                  <ExternalLink className="w-5 h-5 text-white" />
                  Ver Petición On-Chain
                </EditorialButton>
                <EditorialButton 
                  variant="outline" 
                  size="lg"
                  className="flex-1 flex items-center justify-center gap-2"
                  onClick={() => window.print()}
                >
                  <Download className="w-5 h-5" />
                  Descargar Recibo (PDF)
                </EditorialButton>
              </div>

              {/* QR for public verification */}
              <div className="bg-white border-2 border-[#1A1A1A] p-6">
                <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-4 text-center">
                  Verificación Pública
                </div>
                <div className="border-2 border-[#1A1A1A] p-4 mb-4">
                  <div className="w-full aspect-square bg-[#E8E6DD] flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm text-[#4A4A4A] mb-2">QR Code</div>
                      <div className="text-xs text-[#4A4A4A] font-mono">
                        /verificar/{session.id}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-center text-[#4A4A4A] mb-4">
                  Escanea este código QR para verificar públicamente este recibo
                </p>
                <a
                  href={`/verificar/${session.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-sm text-[#2D5016] hover:underline"
                >
                  Abrir verificación pública →
                </a>
              </div>
            </>
          )}

          {/* Evidence Hash */}
          {session.status === 'Completada' && session.evidenceHash && (
            <EvidenceHash 
              evidenceHash={session.evidenceHash}
              evidenceCount={session.evidence?.length || 0}
            />
          )}

          {/* Trust Score (for review or completed) */}
          {session.trustScore && (session.status === 'Pendiente de verificación' || session.status === 'Completada') && (
            <TrustScore trustScore={session.trustScore} />
          )}

          {/* Pending verification banner */}
          {session.status === 'Pendiente de verificación' && (
            <Callout title="Requiere Revisión Manual" variant="warning">
              <p className="text-sm mb-3">
                Requiere revisión manual antes de emitir recibo on-chain.
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside text-[#4A4A4A]">
                <li>El operador verificará los kilogramos exactos</li>
                <li>Se emitirá el recibo en Solana tras aprobación</li>
              </ul>
            </Callout>
          )}

          {/* Timeline */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <h3 className="mb-6 pb-4 border-b-2 border-[#1A1A1A] text-sm uppercase tracking-wider">
              Bitácora de la Sesión
            </h3>
            <Timeline timeline={session.timeline} />
          </div>

          {/* Cancellation reason */}
          {session.status === 'Cancelada' && session.cancellationReason && (
            <Callout title="Motivo de Cancelación" variant="warning">
              <p className="text-sm italic">{session.cancellationReason}</p>
            </Callout>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* EcoCoins */}
          <div className="bg-[#E8F4E3] border-2 border-[#2D5016] p-6">
            <div className="text-xs uppercase tracking-wider text-[#2D5016] mb-3">
              {session.status === 'Completada' ? 'ecoCoins Ganados' : 'ecoCoins Estimados'}
            </div>
            <div className="text-center py-6 border-y-2 border-[#2D5016]">
              <div className="text-6xl font-bold text-[#2D5016]" style={{ fontFamily: 'var(--font-serif)' }}>
                {session.status === 'Completada' ? session.ecoCoins : session.estimatedEcoCoins}
              </div>
            </div>
            <div className="text-xs text-center mt-4 text-[#4A4A4A]">
              {session.totalKg.toFixed(1)} KG ÷ 10 = {session.status === 'Completada' ? session.ecoCoins : session.estimatedEcoCoins} ecoCoin{(session.status === 'Completada' ? session.ecoCoins : session.estimatedEcoCoins) !== 1 ? 's' : ''}
            </div>
          </div>

          {/* QR Code */}
          {session.qrCode && session.status !== 'Completada' && session.status !== 'Cancelada' && (
            <div className="bg-white border-2 border-[#1A1A1A] p-6">
              <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-4 text-center">
                Código de Validación
              </div>
              <div className="border-2 border-[#1A1A1A] p-4 mb-4">
                <div className="w-full aspect-square bg-[#E8E6DD] flex items-center justify-center">
                  <div className="text-sm text-[#4A4A4A]">{session.qrCode}</div>
                </div>
              </div>
              <p className="text-xs text-center text-[#4A4A4A]">
                Presenta este código en el punto de acopio
              </p>
            </div>
          )}

          {/* Quick actions */}
          {session.status === 'Completada' && !isOperador && (
            <Callout title="Repetir Sesión" variant="success">
              <p className="text-sm mb-4">
                ¿Tienes más materiales? Crea una sesión similar con los mismos datos.
              </p>
              <EditorialButton
                variant="primary"
                size="md"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => navigate('/crear/punto')}
              >
                <RefreshCw className="w-4 h-4" />
                Nueva Sesión
              </EditorialButton>
            </Callout>
          )}
        </div>
      </div>

      {/* Cancel dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="bg-white border-2 border-[#1A1A1A] max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-serif)' }}>
              Cancelar Sesión
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="block mb-3 text-sm uppercase tracking-wider">
              Motivo de Cancelación (Obligatorio)
            </label>
            <textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Indica por qué necesitas cancelar esta sesión..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5016] resize-none"
            />
          </div>
          <DialogFooter className="flex gap-3">
            <EditorialButton
              variant="outline"
              size="md"
              onClick={() => setShowCancelDialog(false)}
              className="flex-1"
            >
              Volver
            </EditorialButton>
            <EditorialButton
              variant="primary"
              size="md"
              onClick={handleCancel}
              disabled={!cancellationReason.trim()}
              className="flex-1"
            >
              Confirmar Cancelación
            </EditorialButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SessionDetail;