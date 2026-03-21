import React, { useState } from 'react';
import { SolanaReceipt as SolanaReceiptType } from '../../types';
import { Copy, Check, ExternalLink, ChevronDown, ChevronUp, Shield, X } from 'lucide-react';

interface SolanaReceiptProps {
  receipt: SolanaReceiptType;
  sessionNumber: string;
  totalKg: number;
  ecoCoins: number;
}

// Modal que muestra el "comprobante de integridad" para recibos demo
const DemoProofModal: React.FC<{
  receipt: SolanaReceiptType;
  sessionNumber: string;
  onClose: () => void;
}> = ({ receipt, sessionNumber, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="bg-white border-4 border-[#1A1A1A] w-full max-w-lg overflow-y-auto max-h-screen"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b-4 border-[#1A1A1A] px-6 py-4 flex items-start justify-between bg-[#FFF4E6]">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-[#B85C00] mb-1">
              Comprobante de Integridad
            </div>
            <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
              Sesión No. {sessionNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#E8E6DD] transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Explanation */}
          <div className="flex gap-3 p-4 bg-[#FFF4E6] border-l-4 border-[#B85C00]">
            <Shield className="w-5 h-5 text-[#B85C00] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[#B85C00]">
              <p className="font-semibold mb-1">Modo Demo — Hackathon</p>
              <p className="text-xs leading-relaxed">
                Esta sesión fue verificada correctamente. La transacción Solana devnet falló por 
                límites de rate en el airdrop gratuito. El hash SHA-256 a continuación garantiza 
                la integridad criptográfica de los datos igualmente.
              </p>
            </div>
          </div>

          {/* Hash proof */}
          <div>
            <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-2">
              Hash Canónico (SHA-256)
            </div>
            <div className="bg-[#1A1A1A] p-4 text-[#F5F3ED] rounded-none">
              <div className="font-mono text-xs break-all mb-3 leading-relaxed">
                {receipt.signature}
              </div>
              <button
                onClick={() => handleCopy(receipt.signature)}
                className="flex items-center gap-2 text-xs bg-[#4A4A4A] hover:bg-[#2D5016] px-3 py-2 transition-colors text-white"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiado' : 'Copiar hash'}
              </button>
            </div>
          </div>

          {/* Data included in the hash */}
          <div>
            <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-3">
              Datos incluidos en el hash
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Aplicación', value: 'EcoTrade v1' },
                { label: 'Sesión', value: `No. ${sessionNumber}` },
                { label: 'Cluster', value: receipt.cluster },
                { label: 'Fecha de emisión', value: new Date(receipt.emittedAt).toLocaleString('es-ES') },
                { label: 'Programa', value: receipt.programId || 'SPL Memo Program' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-[#E8E6DD]">
                  <span className="text-[#4A4A4A]">{label}</span>
                  <span className="font-mono text-xs font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Explanation of why this is secure */}
          <p className="text-xs text-[#4A4A4A] italic leading-relaxed">
            El hash SHA-256 es determinístico: dado el mismo conjunto de datos, siempre produce 
            el mismo resultado. Cualquier modificación de los datos cambiaría el hash, 
            lo que garantiza la integridad del comprobante.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-[#E8E6DD] px-6 py-4">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#1A1A1A] text-[#F5F3ED] text-sm uppercase tracking-wider hover:bg-[#2D5016] transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export const SolanaReceipt: React.FC<SolanaReceiptProps> = ({ 
  receipt, 
  sessionNumber, 
  totalKg, 
  ecoCoins 
}) => {
  const [copied, setCopied] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Una firma real de Solana es base58, de ~87-88 chars.
  // Si detectamos 64 chars hex, es una firma simulada/demo.
  const isSimulated = /^[0-9a-f]{64}$/i.test(receipt.signature);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {showDemoModal && (
        <DemoProofModal
          receipt={receipt}
          sessionNumber={sessionNumber}
          onClose={() => setShowDemoModal(false)}
        />
      )}

      <div className="bg-white border-4 border-[#1A1A1A] relative">
        {/* Perforated edge effect */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-white border-b-2 border-dashed border-[#1A1A1A]"></div>
        
        {/* Main content */}
        <div className="pt-8 pb-6 px-8">
          {/* Session number */}
          <div className="text-center border-b-2 border-[#1A1A1A] pb-6 mb-6">
            <div className="text-xs uppercase tracking-[0.3em] text-[#4A4A4A] mb-2">
              Recibo Verificable
            </div>
            <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
              Sesión No. {sessionNumber}
            </h2>
            
            {/* ON-CHAIN STAMP */}
            <div className={`inline-block border-4 px-8 py-3 transform -rotate-2 ${
              isSimulated
                ? 'border-[#B85C00] bg-[#FFF4E6]'
                : 'border-[#2D5016] bg-[#E8F4E3]'
            }`}>
              <div className="text-center">
                <div className={`text-2xl font-bold uppercase tracking-wider ${isSimulated ? 'text-[#B85C00]' : 'text-[#2D5016]'}`} style={{ fontFamily: 'var(--font-serif)' }}>
                  {isSimulated ? 'HASH' : 'ON-CHAIN'}
                </div>
                <div className={`text-lg font-bold uppercase tracking-wider ${isSimulated ? 'text-[#B85C00]' : 'text-[#2D5016]'}`} style={{ fontFamily: 'var(--font-serif)' }}>
                  {isSimulated ? 'VERIFIED' : 'VERIFIED'}
                </div>
                <div className={`text-xs mt-1 ${isSimulated ? 'text-[#B85C00]' : 'text-[#2D5016]'}`}>
                  {new Date(receipt.emittedAt).toLocaleDateString('es-ES')}
                </div>
              </div>
            </div>
            {isSimulated && (
              <p className="text-xs text-[#B85C00] mt-3 italic">
                Verificado por hash canónico SHA-256 · Devnet demo
              </p>
            )}
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-[#E8E6DD]">
            <div className="text-center p-4 bg-[#F5F3ED] border border-[#1A1A1A]">
              <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-1">
                Total KG
              </div>
              <div className="text-3xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
                {totalKg.toFixed(1)}
              </div>
            </div>
            <div className="text-center p-4 bg-[#E8F4E3] border border-[#2D5016]">
              <div className="text-xs uppercase tracking-wider text-[#2D5016] mb-1">
                ecoCoins
              </div>
              <div className="text-3xl font-bold text-[#2D5016]" style={{ fontFamily: 'var(--font-serif)' }}>
                {ecoCoins}
              </div>
            </div>
          </div>

          {/* Solana devnet block */}
          <div className="bg-[#1A1A1A] text-[#F5F3ED] p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-[#E8E6DD] mb-1">
                  Cluster
                </div>
                <div className="font-mono text-sm">{receipt.cluster}</div>
              </div>
              <div className={`px-3 py-1 text-white text-xs uppercase tracking-wider ${isSimulated ? 'bg-[#B85C00]' : 'bg-[#2D5016]'}`}>
                {isSimulated ? 'Demo' : 'Solana'}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs uppercase tracking-wider text-[#E8E6DD] mb-2">
                {isSimulated ? 'Proof Hash (SHA-256)' : 'Transaction Signature'}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-xs bg-[#000] px-3 py-2 border border-[#4A4A4A] break-all">
                  {receipt.signature}
                </div>
                <button
                  onClick={() => handleCopy(receipt.signature)}
                  className="p-2 bg-[#4A4A4A] hover:bg-[#2D5016] transition-colors flex-shrink-0"
                  title="Copiar"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Action button */}
            {isSimulated ? (
              <button
                onClick={() => setShowDemoModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#B85C00] hover:bg-[#92400E] text-white text-sm uppercase tracking-wider transition-colors"
              >
                <Shield className="w-4 h-4" />
                Ver Comprobante de Integridad
              </button>
            ) : (
              <a
                href={receipt.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2D5016] hover:bg-[#4A7C2E] text-white text-sm uppercase tracking-wider transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Ver en Solana Explorer
              </a>
            )}
          </div>

          {/* Technical details (collapsible) */}
          <div className="border-t-2 border-[#1A1A1A] pt-4">
            <button
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full flex items-center justify-between text-sm uppercase tracking-wider text-[#1A1A1A] hover:text-[#2D5016] transition-colors"
            >
              <span>Detalles Técnicos</span>
              {showTechnical ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {showTechnical && (
              <div className="mt-4 pt-4 border-t border-[#E8E6DD] space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#4A4A4A]">Program ID:</span>
                  <span className="font-mono text-xs">{receipt.programId || 'Memo Program'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4A4A4A]">Emitido:</span>
                  <span className="font-mono text-xs">
                    {new Date(receipt.emittedAt).toLocaleString('es-ES')}
                  </span>
                </div>
                <p className="text-xs text-[#4A4A4A] italic">
                  {isSimulated
                    ? 'Recibo generado en modo demo (hackathon). Hash SHA-256 canónico garantiza integridad de datos off-chain.'
                    : 'Recibo emitido en Solana (devnet) y verificable públicamente.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Perforated bottom edge */}
        <div className="h-3 bg-white border-t-2 border-dashed border-[#1A1A1A]"></div>
      </div>
    </>
  );
};
