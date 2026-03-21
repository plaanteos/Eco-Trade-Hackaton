import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { SolanaReceipt } from '../components/editorial/SolanaReceipt';
import { EvidenceHash } from '../components/editorial/EvidenceHash';
import { CarbonImpactBadge } from '../components/editorial/CarbonImpactBadge';
import { getPublicSession } from '@/lib/sessions';
import { verificarReciboPublico } from '@/lib/solana';
import { PublicSessionData } from '@/lib/sessions';
import { MapPin, Calendar, Clock, Package, Shield, Loader2, Leaf, ExternalLink } from 'lucide-react';

const PublicVerification: React.FC = () => {
  const { id } = useParams();
  const [session, setSession] = useState<PublicSessionData | null>(null);
  const [chainStatus, setChainStatus] = useState<'checking' | 'valid' | 'invalid' | 'missing'>('checking');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const data = await getPublicSession(id);
        setSession(data);
        
        if (data?.solanaReceipt?.signature) {
          setChainStatus('checking');
          const verification = await verificarReciboPublico(data.solanaReceipt.signature);
          setChainStatus(verification.valid ? 'valid' : 'invalid');
        } else {
          setChainStatus('missing');
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
      <div className="min-h-screen bg-[#F5F3ED] flex items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-[#2D5016] mb-4" />
          <p>Verificando registro público...</p>
        </div>
      </div>
    );
  }

  if (!session || session.status !== 'Completada' || !session.solanaReceipt) {
    return (
      <div className="min-h-screen bg-[#F5F3ED] flex items-center justify-center px-6">
        <div className="max-w-2xl w-full text-center bg-white border-4 border-[#1A1A1A] p-12">
          <h1 className="mb-4">Recibo No Encontrado</h1>
          <p className="text-[#4A4A4A] mb-6">
            El recibo que buscas no existe o no ha sido emitido en la blockchain aún.
          </p>
          <div className="text-sm text-[#4A4A4A] italic">
            Solo sesiones completadas y verificadas tienen recibo on-chain.
          </div>
        </div>
      </div>
    );
  }

  const receipt = session.solanaReceipt;
  const isValidOnChain = chainStatus === 'valid';
  const isChecking = chainStatus === 'checking';
  const isInvalid = chainStatus === 'invalid';

  return (
    <div className="min-h-screen bg-[#F5F3ED]">
      <header className="bg-[#1A1A1A] text-[#F5F3ED] border-b-4 border-[#2D5016]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="text-xs uppercase tracking-[0.3em] text-[#E8E6DD] mb-2">
            EcoTrade — Verificación Pública
          </div>
          <h1 className="mb-2" style={{ fontFamily: 'var(--font-serif)', color: '#F5F3ED' }}>
            Verificación de Recibo
          </h1>
          <p className="text-sm text-[#E8E6DD]">
            {isChecking
              ? 'Verificando transacción en Solana (devnet)…'
              : isValidOnChain
                ? 'Este recibo ha sido verificado y emitido en Solana blockchain (devnet).'
                : 'Este recibo está registrado, pero la transacción aún no aparece confirmada en Solana.'}
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="mb-12 text-center">
          <div className="inline-block border-4 border-[#2D5016] bg-white px-12 py-6 transform rotate-1 shadow-lg">
            <Shield className="w-12 h-12 text-[#2D5016] mx-auto mb-3" />
            <div className="text-3xl font-bold text-[#2D5016] uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
              {isValidOnChain ? 'RECIBO VERIFICADO' : 'RECIBO EN PROCESO'}
            </div>
            <div className="text-lg text-[#2D5016] uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
              EN SOLANA
            </div>
            {!isChecking && (
              <div className={`text-sm tracking-wider font-bold ${isValidOnChain ? 'text-green-600' : 'text-red-600'}`}>
                {isValidOnChain ? '✓ FIRMA ON-CHAIN VÁLIDA' : '✗ FIRMA NO ENCONTRADA EN EXPLORADOR'}
              </div>
            )}

            {receipt?.explorerUrl && (
              <a
                href={receipt.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#2D5016] text-white uppercase tracking-wider text-xs hover:bg-[#4A7C2E]"
              >
                <ExternalLink className="w-4 h-4" />
                Ver transacción
              </a>
            )}
          </div>
        </div>

        <div className="mb-8">
          <SolanaReceipt 
            receipt={session.solanaReceipt}
            sessionNumber={session.sessionNumber}
            totalKg={session.verifiedTotalKg || session.totalKg}
            ecoCoins={session.ecoCoins}
          />
        </div>

        {/* Bloque de Impacto Ambiental */}
        {session.carbonOffset && (
          <div className="bg-white border-2 border-[#1A1A1A] mb-8 p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0 bg-[#E8F4E3] p-4 border-2 border-[#2D5016]">
                <Leaf className="w-10 h-10 text-[#2D5016]" />
              </div>
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-2 font-bold">
                  Impacto Ambiental Verificado
                </div>
                <CarbonImpactBadge 
                  co2Kg={session.carbonOffset.co2_avoided_kg} 
                  trees={session.carbonOffset.trees_equivalent} 
                  className="p-0 border-none bg-transparent"
                />
                <p className="mt-4 text-xs text-[#4A4A4A] border-t border-[#E8E6DD] pt-3 italic">
                  Impacto calculado con factores internacionales de conversión. 
                  Verificable on-chain junto al recibo Solana.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#2D5016] flex-shrink-0 mt-1" />
              <div>
                <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-2">
                  Punto de Acopio
                </div>
                <div className="font-bold mb-1">{session.point.name}</div>
                <div className="text-sm text-[#4A4A4A]">{session.point.address}</div>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-[#2D5016] flex-shrink-0 mt-1" />
              <div>
                <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-2">
                  Fecha de Entrega
                </div>
                <div className="font-bold mb-1">
                  {session.scheduledDate && new Date(session.scheduledDate + 'T00:00:00').toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
                {session.scheduledTime && (
                  <div className="text-sm text-[#4A4A4A] flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {session.scheduledTime}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-[#1A1A1A] mb-8">
          <div className="p-6 border-b-2 border-[#1A1A1A] flex items-center gap-3">
            <Package className="w-6 h-6 text-[#2D5016]" />
            <h2 className="text-sm uppercase tracking-wider font-bold">Inventario de Materiales</h2>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E6DD] bg-[#E8E6DD]">
                <th className="text-left p-4 text-xs uppercase tracking-wider font-medium">Material</th>
                <th className="text-right p-4 text-xs uppercase tracking-wider font-medium">Kilogramos Verificados</th>
              </tr>
            </thead>
            <tbody>
              {session.materials.map((material, idx) => (
                <tr key={idx} className="border-b border-[#E8E6DD]">
                  <td className="p-4">
                    <div className="font-medium">{material.type}</div>
                  </td>
                  <td className="text-right p-4 font-medium">
                    {(material.verifiedKg || material.kg).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#1A1A1A] bg-[#E8E6DD]">
                <td className="p-4 font-bold uppercase tracking-wider">Total</td>
                <td className="text-right p-4 font-bold text-lg">
                  {(session.verifiedTotalKg || session.totalKg).toFixed(1)} KG
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {session.evidenceHash && (
          <div className="mb-8">
            <EvidenceHash 
              evidenceHash={session.evidenceHash}
              evidenceCount={0} 
            />
          </div>
        )}

        <div className="bg-[#FFF4E6] border-l-4 border-[#B85C00] p-6">
          <h3 className="text-sm uppercase tracking-wider font-bold mb-3">Privacidad</h3>
          <p className="text-sm text-[#1A1A1A]">
            Esta verificación pública solo muestra información necesaria para comprobar 
            la validez del recibo. No se exponen datos personales sensibles como 
            email, teléfono o dirección del usuario.
          </p>
        </div>
      </div>

      <footer className="bg-[#1A1A1A] text-[#F5F3ED] border-t-4 border-[#2D5016] mt-20">
        <div className="max-w-5xl mx-auto px-6 py-8 text-center">
          <div className="text-sm text-[#E8E6DD]">
            EcoTrade © 2026 — Economía Circular con Blockchain
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicVerification;
