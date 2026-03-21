import React from 'react';
import { RecyclingSession } from '../../types';
import { StatusBadge } from './StatusBadge';
import { useNavigate } from 'react-router';

interface SessionCardProps {
  session: RecyclingSession;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session }) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`/sesion/${session.id}`)}
      className="bg-white border-2 border-[#1A1A1A] p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#4A4A4A] mb-1">Sesión</div>
          <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
            No. {session.sessionNumber}
          </div>
        </div>
        <StatusBadge status={session.status} />
      </div>

      <div className="border-t border-[#E8E6DD] pt-4 mb-4">
        <div className="font-semibold mb-1">{session.point.name}</div>
        <div className="text-sm text-[#4A4A4A]">{session.point.address}</div>
      </div>

      {session.scheduledDate && (
        <div className="mb-4 text-sm">
          <span className="text-[#4A4A4A]">Programada: </span>
          <span className="font-medium">
            {new Date(session.scheduledDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            {session.scheduledTime && ` • ${session.scheduledTime}`}
          </span>
        </div>
      )}

      <div className="border-t border-[#E8E6DD] pt-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-[#4A4A4A] uppercase tracking-wider">Total</div>
          <div className="text-lg font-bold">{session.totalKg.toFixed(1)} KG</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#4A4A4A] uppercase tracking-wider">
            {session.status === 'Completada' ? 'Ganados' : 'Estimados'}
          </div>
          <div className="text-lg font-bold text-[#2D5016]">
            {session.status === 'Completada' ? session.ecoCoins : session.estimatedEcoCoins} 
            <span className="text-sm ml-1">ecoCoins</span>
          </div>
        </div>
      </div>
    </div>
  );
};
