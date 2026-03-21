import React from 'react';
import { Leaf } from 'lucide-react';

interface CarbonImpactBadgeProps {
  co2Kg: number;
  trees: number;
  className?: string;
}

export const CarbonImpactBadge: React.FC<CarbonImpactBadgeProps> = ({ co2Kg, trees, className = '' }) => {
  if (co2Kg <= 0) return null;

  return (
    <div 
      className={`inline-flex items-center gap-3 px-4 py-3 ${className}`}
      style={{ 
        backgroundColor: '#F5F3ED', 
        border: '1px solid #1A1A1A',
        fontFamily: 'var(--font-sans)',
        color: '#1A1A1A'
      }}
    >
      <div 
        className="flex items-center justify-center w-8 h-8 flex-shrink-0"
        style={{ backgroundColor: '#2D5016', color: '#F5F3ED', borderRadius: '50%' }}
      >
        <Leaf className="w-4 h-4" />
      </div>
      <div>
        <p className="text-sm font-semibold m-0 leading-tight">
          {co2Kg.toFixed(1)} kg CO₂ evitado
        </p>
        <p className="text-xs m-0 mt-0.5" style={{ color: '#4A4A4A' }}>
          equivale a plantar {trees} {trees === 1 ? 'árbol' : 'árboles'}
        </p>
      </div>
    </div>
  );
};
