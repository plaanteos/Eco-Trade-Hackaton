import React from 'react';
import { TrustScore as TrustScoreType } from '../../types';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface TrustScoreProps {
  trustScore: TrustScoreType;
  compact?: boolean;
}

export const TrustScore: React.FC<TrustScoreProps> = ({ trustScore, compact = false }) => {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Alta': return { bg: '#E8F4E3', border: '#2D5016', text: '#2D5016' };
      case 'Media': return { bg: '#FFF4E6', border: '#B85C00', text: '#B85C00' };
      case 'Baja': return { bg: '#FFE8E8', border: '#B91C1C', text: '#B91C1C' };
      default: return { bg: '#F5F3ED', border: '#4A4A4A', text: '#4A4A4A' };
    }
  };

  const colors = getLevelColor(trustScore.level);

  if (compact) {
    return (
      <div 
        className="inline-flex items-center gap-2 px-3 py-1.5 border-2"
        style={{ 
          backgroundColor: colors.bg, 
          borderColor: colors.border,
          color: colors.text
        }}
      >
        <div className="font-bold text-lg" style={{ fontFamily: 'var(--font-serif)' }}>
          {trustScore.score}
        </div>
        <div className="text-xs uppercase tracking-wider font-semibold">
          {trustScore.level}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-[#1A1A1A]">
      {/* Header */}
      <div 
        className="px-6 py-4 border-b-2"
        style={{ 
          backgroundColor: colors.bg, 
          borderColor: colors.border 
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.text }}>
              Score de Confianza
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-bold" style={{ fontFamily: 'var(--font-serif)', color: colors.text }}>
                {trustScore.score}
              </div>
              <div className="text-xl uppercase tracking-wider font-bold" style={{ color: colors.text }}>
                {trustScore.level}
              </div>
            </div>
          </div>
          {trustScore.requiresReview && (
            <div className="text-right">
              <AlertTriangle className="w-8 h-8 mx-auto mb-1" style={{ color: colors.text }} />
              <div className="text-xs uppercase tracking-wider" style={{ color: colors.text }}>
                Requiere<br />Revisión
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Signals checklist */}
      <div className="p-6">
        <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-4">
          Señales de Verificación
        </div>
        <div className="space-y-3">
          {trustScore.signals.map((signal) => (
            <div 
              key={signal.id}
              className={`flex items-start gap-3 pb-3 border-b border-[#E8E6DD] last:border-0 ${
                signal.critical && !signal.passed ? 'bg-[#FFE8E8] -mx-3 px-3 py-2' : ''
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {signal.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-[#2D5016]" />
                ) : (
                  <XCircle className={`w-5 h-5 ${signal.critical ? 'text-[#B91C1C]' : 'text-[#B85C00]'}`} />
                )}
              </div>
              <div className="flex-1">
                <div className={`text-sm ${signal.passed ? 'text-[#1A1A1A]' : 'font-medium'}`}>
                  {signal.label}
                </div>
                {signal.critical && !signal.passed && (
                  <div className="text-xs text-[#B91C1C] mt-1 uppercase tracking-wider">
                    Señal Crítica
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {trustScore.requiresReview && (
          <div className="mt-6 pt-6 border-t-2 border-[#1A1A1A]">
            <div className="bg-[#FFF4E6] border-l-4 border-[#B85C00] p-4">
              <p className="text-sm text-[#1A1A1A]">
                <strong>Confianza {trustScore.level.toLowerCase()}:</strong> requiere revisión antes de emitir on-chain.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
