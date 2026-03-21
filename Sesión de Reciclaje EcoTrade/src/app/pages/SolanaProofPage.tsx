// ============================================================
//  EcoTrade — Página de Comprobante On-Chain
//  src/app/pages/SolanaProofPage.tsx
//
//  Muestra el recibo Solana o el comprobante de integridad
//  demo en una página completa, premium y elegante.
// ============================================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getSessionById } from '@/lib/sessions';
import { RecyclingSession } from '@/app/types';
import {
  ArrowLeft, Copy, Check, ExternalLink, Shield,
  Leaf, Loader2, CheckCircle, Hash
} from 'lucide-react';
import { EditorialButton } from '../components/editorial/EditorialButton';

const SolanaProofPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<RecyclingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getSessionById(id)
      .then(setSession)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F3ED] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-[#2D5016] mb-4" />
          <p className="text-[#4A4A4A]">Cargando comprobante...</p>
        </div>
      </div>
    );
  }

  if (!session || !session.solanaReceipt) {
    return (
      <div className="min-h-screen bg-[#F5F3ED] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⛓️</div>
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
            Comprobante no disponible
          </h2>
          <p className="text-[#4A4A4A] mb-6">
            {!session
              ? 'No se encontró la sesión especificada.'
              : 'Esta sesión aún no tiene recibo on-chain. El operador debe completar la verificación.'}
          </p>
          <EditorialButton variant="primary" onClick={() => navigate(id ? `/sesion/${id}` : '/historial')}>
            Volver a la sesión
          </EditorialButton>
        </div>
      </div>
    );
  }

  const receipt = session.solanaReceipt;
  const isSimulated = /^[0-9a-f]{64}$/i.test(receipt.signature);

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F3ED]">
      {/* Top bar */}
      <div className="border-b-2 border-[#4A4A4A] px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(`/sesion/${id}`)}
          className="flex items-center gap-2 text-sm text-[#E8E6DD] hover:text-[#2D5016] transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="flex-1 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[#E8E6DD]">
            {isSimulated ? 'Comprobante de Integridad' : 'Registro On-Chain'}
          </span>
        </div>
        {/* EcoTrade logo */}
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-[#2D5016]" />
          <span className="text-sm font-bold tracking-wider">EcoTrade</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header section */}
        <div className="text-center mb-12">
          {/* Big stamp */}
          <div className={`inline-block border-4 px-12 py-6 mb-8 transform -rotate-1 ${
            isSimulated
              ? 'border-[#F59E0B] bg-[#78350F]'
              : 'border-[#4ADE80] bg-[#14532D]'
          }`}>
            <div className={`text-xs uppercase tracking-[0.4em] mb-2 ${
              isSimulated ? 'text-[#FCD34D]' : 'text-[#86EFAC]'
            }`}>
              {isSimulated ? 'Hackathon Demo' : 'Solana Devnet'}
            </div>
            <div className={`text-4xl font-black uppercase tracking-wider mb-1 ${
              isSimulated ? 'text-[#FCD34D]' : 'text-[#4ADE80]'
            }`} style={{ fontFamily: 'var(--font-serif)' }}>
              {isSimulated ? 'HASH' : 'ON-CHAIN'}
            </div>
            <div className={`text-2xl font-bold uppercase tracking-wider ${
              isSimulated ? 'text-[#FCD34D]' : 'text-[#4ADE80]'
            }`} style={{ fontFamily: 'var(--font-serif)' }}>
              VERIFIED
            </div>
            <div className={`text-xs mt-2 ${isSimulated ? 'text-[#FCD34D]' : 'text-[#86EFAC]'}`}>
              {new Date(receipt.emittedAt).toLocaleString('es-ES')}
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Sesión No. {session.sessionNumber}
          </h1>
          <p className="text-[#E8E6DD] text-sm">
            {isSimulated
              ? 'Comprobante de integridad criptográfica — SHA-256 canónico'
              : 'Transacción confirmada en la blockchain de Solana'}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#4A4A4A] border border-[#4A4A4A] mb-8">
          {[
            { label: 'KG Verificados', value: `${(session.verifiedTotalKg ?? session.totalKg).toFixed(1)} kg` },
            { label: 'ecoCoins', value: String(session.ecoCoins), green: true },
            { label: 'CO₂ Evitado', value: session.carbonOffset ? `${session.carbonOffset.co2_avoided_kg.toFixed(1)} kg` : '—' },
            { label: 'Árboles Eq.', value: session.carbonOffset ? `${session.carbonOffset.trees_equivalent}` : '—' },
          ].map(({ label, value, green }) => (
            <div key={label} className={`p-6 text-center ${green ? 'bg-[#14532D]' : 'bg-[#2A2A2A]'}`}>
              <div className="text-xs uppercase tracking-wider text-[#E8E6DD] mb-2">{label}</div>
              <div className={`text-2xl font-bold ${green ? 'text-[#4ADE80]' : 'text-[#F5F3ED]'}`}
                style={{ fontFamily: 'var(--font-serif)' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Proof block */}
        <div className="border-2 border-[#4A4A4A] mb-8">
          {/* Block header */}
          <div className={`px-6 py-4 flex items-center justify-between border-b border-[#4A4A4A] ${
            isSimulated ? 'bg-[#78350F]' : 'bg-[#14532D]'
          }`}>
            <div className="flex items-center gap-3">
              {isSimulated
                ? <Hash className="w-5 h-5 text-[#FCD34D]" />
                : <CheckCircle className="w-5 h-5 text-[#4ADE80]" />
              }
              <div>
                <div className={`text-xs uppercase tracking-wider ${isSimulated ? 'text-[#FCD34D]' : 'text-[#86EFAC]'}`}>
                  {isSimulated ? 'SHA-256 Canonical Hash' : 'Transaction Signature'}
                </div>
                <div className="text-xs text-[#E8E6DD] mt-0.5">
                  Cluster: {receipt.cluster} · Program: {receipt.programId?.slice(0, 8)}…
                </div>
              </div>
            </div>
            <div className={`px-3 py-1 text-xs uppercase tracking-wider font-bold ${
              isSimulated ? 'bg-[#F59E0B] text-[#1A1A1A]' : 'bg-[#4ADE80] text-[#1A1A1A]'
            }`}>
              {isSimulated ? 'Demo' : 'Confirmed'}
            </div>
          </div>

          {/* Signature */}
          <div className="p-6 bg-[#0A0A0A]">
            <div className="font-mono text-sm text-[#4ADE80] break-all leading-relaxed mb-4">
              {receipt.signature}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => handleCopy(receipt.signature)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-sm uppercase tracking-wider transition-colors border border-[#4A4A4A]"
              >
                {copied ? <Check className="w-4 h-4 text-[#4ADE80]" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              {!isSimulated && (
                <a
                  href={receipt.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#2D5016] hover:bg-[#4A7C2E] text-sm uppercase tracking-wider transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver en Explorer
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Demo explanation, only if simulated */}
        {isSimulated && (
          <div className="border-l-4 border-[#F59E0B] bg-[#2A2A2A] p-6 mb-8">
            <div className="flex gap-4">
              <Shield className="w-6 h-6 text-[#F59E0B] flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#FCD34D] mb-2 uppercase tracking-wider text-sm">
                  Sobre este comprobante
                </div>
                <p className="text-sm text-[#E8E6DD] leading-relaxed mb-3">
                  La transacción Solana falló por límites de airdrop gratuito en devnet. 
                  Este hash SHA-256 canónico equivale criptográficamente a un sello de datos: 
                  cualquier modificación de la información cambiaría el hash.
                </p>
                <div className="text-xs text-[#E8E6DD] space-y-1">
                  <div className="flex gap-2">
                    <span className="text-[#F59E0B] w-28 flex-shrink-0">Algoritmo:</span>
                    <span className="font-mono">SHA-256</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#F59E0B] w-28 flex-shrink-0">Datos hasheados:</span>
                    <span>ID sesión · Session No. · KG verificados · CO₂ · Operador · Timestamp</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Session meta */}
        <div className="border border-[#4A4A4A] divide-y divide-[#4A4A4A] mb-10">
          {[
            { label: 'Punto de Acopio', value: session.point.name },
            { label: 'Fecha de sesión', value: session.scheduledDate ? new Date(session.scheduledDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
            { label: 'Estado', value: session.status },
            { label: 'Emitido', value: new Date(receipt.emittedAt).toLocaleString('es-ES') },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between px-6 py-4 text-sm hover:bg-[#2A2A2A] transition-colors">
              <span className="text-[#E8E6DD] uppercase tracking-wider text-xs">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Leaf className="w-5 h-5 text-[#2D5016]" />
            <span className="font-bold tracking-wider">EcoTrade</span>
          </div>
          <p className="text-xs text-[#4A4A4A] mb-6">
            Economía Circular · Verificación Blockchain · Solana
          </p>
          <EditorialButton
            variant="outline"
            size="md"
            onClick={() => navigate(`/sesion/${id}`)}
            className="border-[#4A4A4A] text-[#F5F3ED] hover:border-[#2D5016]"
          >
            ← Volver al Detalle de la Sesión
          </EditorialButton>
        </div>

      </div>
    </div>
  );
};

export default SolanaProofPage;
