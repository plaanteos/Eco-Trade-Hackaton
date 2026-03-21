import React, { useState } from 'react';
import { SolanaReceipt as SolanaReceiptType } from '../../types';
import { Copy, Check, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface SolanaReceiptProps {
  receipt: SolanaReceiptType;
  sessionNumber: string;
  totalKg: number;
  ecoCoins: number;
}

export const SolanaReceipt: React.FC<SolanaReceiptProps> = ({ 
  receipt, 
  sessionNumber, 
  totalKg, 
  ecoCoins 
}) => {
  const [copied, setCopied] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  // Una firma real de Solana es base58, de ~87-88 chars.
  // Si detectamos 64 chars hex, es una firma simulada/demo.
  const isSimulated = /^[0-9a-f]{64}$/i.test(receipt.signature);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSignature = (sig: string) => {
    if (sig.length > 20) {
      return `${sig.substring(0, 8)}...${sig.substring(sig.length - 8)}`;
    }
    return sig;
  };

  return (
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
                {isSimulated ? 'DEMO' : 'ON-CHAIN'}
              </div>
              <div className={`text-lg font-bold uppercase tracking-wider ${isSimulated ? 'text-[#B85C00]' : 'text-[#2D5016]'}`} style={{ fontFamily: 'var(--font-serif)' }}>
                {isSimulated ? 'SIMULADO' : 'VERIFIED'}
              </div>
              <div className={`text-xs mt-1 ${isSimulated ? 'text-[#B85C00]' : 'text-[#2D5016]'}`}>
                {new Date(receipt.emittedAt).toLocaleDateString('es-ES')}
              </div>
            </div>
          </div>
          {isSimulated && (
            <p className="text-xs text-[#B85C00] mt-3 italic">
              ⚠ Modo demo — recibo generado localmente sin tx real en la blockchain.
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
            <div className="px-3 py-1 bg-[#2D5016] text-white text-xs uppercase tracking-wider">
              Solana
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs uppercase tracking-wider text-[#E8E6DD] mb-2">
              Transaction Signature
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-sm bg-[#000] px-3 py-2 border border-[#4A4A4A] break-all">
                {receipt.signature}
              </div>
              <button
                onClick={() => handleCopy(receipt.signature)}
                className="p-2 bg-[#4A4A4A] hover:bg-[#2D5016] transition-colors"
                title="Copiar"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <a
            href={receipt.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-4 py-2 text-white text-sm uppercase tracking-wider transition-colors ${
              isSimulated 
                ? 'bg-[#B85C00] hover:bg-[#92400E]'
                : 'bg-[#2D5016] hover:bg-[#4A7C2E]'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            {isSimulated ? 'Ver Registro Demo' : 'Ver en Solana Explorer'}
          </a>
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
                  ? 'Recibo generado en modo demo (hackathon). El hash canónico garantiza integridad de datos.'
                  : 'Recibo emitido en Solana (devnet) y verificable públicamente.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Perforated bottom edge */}
      <div className="h-3 bg-white border-t-2 border-dashed border-[#1A1A1A]"></div>
    </div>
  );
};
