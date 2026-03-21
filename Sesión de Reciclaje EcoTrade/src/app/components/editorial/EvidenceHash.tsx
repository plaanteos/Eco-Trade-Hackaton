import React, { useState } from 'react';
import { Copy, Check, Shield, Image as ImageIcon } from 'lucide-react';

interface EvidenceHashProps {
  evidenceHash: string;
  evidenceCount?: number;
}

export const EvidenceHash: React.FC<EvidenceHashProps> = ({ evidenceHash, evidenceCount = 0 }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(evidenceHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border-2 border-[#1A1A1A] p-6">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-6 h-6 text-[#2D5016]" />
        <h3 className="text-sm uppercase tracking-wider font-bold">Evidencia Anclada</h3>
      </div>

      {evidenceCount > 0 && (
        <div className="flex items-center gap-2 mb-4 text-sm text-[#4A4A4A]">
          <ImageIcon className="w-4 h-4" />
          <span>{evidenceCount} {evidenceCount === 1 ? 'fotografía' : 'fotografías'} verificadas</span>
        </div>
      )}

      <div className="mb-4">
        <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-2">
          Evidence Hash
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 font-mono text-xs bg-[#F5F3ED] px-3 py-2 border border-[#E8E6DD] break-all">
            {evidenceHash}
          </div>
          <button
            onClick={handleCopy}
            className="p-2 border-2 border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors"
            title="Copiar hash"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <p className="text-xs text-[#4A4A4A] italic border-t border-[#E8E6DD] pt-4">
        La cadena prueba integridad por hash. No expone datos privados.
      </p>
    </div>
  );
};
