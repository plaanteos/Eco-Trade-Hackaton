import React from 'react';
import { SessionStatus } from '../../types';

interface StatusBadgeProps {
  status: SessionStatus;
  variant?: 'default' | 'stamp';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'default' }) => {
  const statusStyles: Record<SessionStatus, string> = {
    'Borrador': 'bg-[#E8E6DD] text-[#4A4A4A] border-[#4A4A4A]',
    'Programada': 'bg-[#FEF3C7] text-[#92400E] border-[#92400E]',
    'En curso': 'bg-[#DBEAFE] text-[#1E40AF] border-[#1E40AF]',
    'Pendiente de verificación': 'bg-[#FFF4E6] text-[#B85C00] border-[#B85C00]',
    'Completada': 'bg-[#D1FAE5] text-[#065F46] border-[#065F46]',
    'Cancelada': 'bg-[#FEE2E2] text-[#991B1B] border-[#991B1B]',
  };

  if (variant === 'stamp') {
    return (
      <div className={`inline-block px-6 py-3 border-2 ${statusStyles[status]} rotate-[-3deg] shadow-sm`}>
        <div className="font-bold tracking-wider uppercase text-sm">
          {status}
        </div>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 border ${statusStyles[status]} text-xs uppercase tracking-wide font-medium`}>
      {status}
    </span>
  );
};