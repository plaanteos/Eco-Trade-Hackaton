import React from 'react';
import { RecyclingSession } from '../../types';
import { StatusBadge } from './StatusBadge';

interface TicketProps {
  session: RecyclingSession;
  showStamp?: boolean;
}

export const Ticket: React.FC<TicketProps> = ({ session, showStamp = false }) => {
  return (
    <div className="relative bg-white border-2 border-[#1A1A1A] p-8 shadow-md">
      {/* Perforated edge effect */}
      <div className="absolute -left-2 top-0 bottom-0 w-4 flex flex-col justify-around">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-[#F5F3ED]" />
        ))}
      </div>

      {/* Session number */}
      <div className="mb-6 pb-4 border-b border-[#1A1A1A]">
        <div className="text-xs uppercase tracking-widest text-[#4A4A4A] mb-1">Sesión de Reciclaje</div>
        <div className="text-4xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
          No. {session.sessionNumber}
        </div>
      </div>

      {/* Point info */}
      <div className="mb-6">
        <div className="text-sm uppercase tracking-wider text-[#4A4A4A] mb-2">Punto de Acopio</div>
        <div className="text-lg font-semibold mb-1">{session.point.name}</div>
        <div className="text-sm text-[#4A4A4A]">{session.point.address}</div>
      </div>

      {/* Schedule */}
      {session.scheduledDate && (
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-1">Fecha</div>
            <div className="font-medium">{new Date(session.scheduledDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-1">Horario</div>
            <div className="font-medium">{session.scheduledTime}</div>
          </div>
        </div>
      )}

      {/* Materials summary */}
      <div className="mb-6 border-t border-[#1A1A1A] pt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#4A4A4A]">
              <th className="text-left py-2 text-xs uppercase tracking-wider text-[#4A4A4A]">Material</th>
              <th className="text-right py-2 text-xs uppercase tracking-wider text-[#4A4A4A]">KG</th>
            </tr>
          </thead>
          <tbody>
            {session.materials.map((material, idx) => (
              <tr key={idx} className="border-b border-[#E8E6DD]">
                <td className="py-2">{material.type}</td>
                <td className="text-right font-medium">{material.kg.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className="pt-3">Total</td>
              <td className="text-right pt-3">{session.totalKg.toFixed(1)} KG</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* EcoCoins */}
      <div className="mb-6 bg-[#E8F4E3] border-2 border-[#2D5016] p-4">
        <div className="text-center">
          <div className="text-sm uppercase tracking-wider text-[#2D5016] mb-1">
            {session.status === 'Completada' ? 'ecoCoins Ganados' : 'ecoCoins Estimados'}
          </div>
          <div className="text-5xl font-bold text-[#2D5016]" style={{ fontFamily: 'var(--font-serif)' }}>
            {session.status === 'Completada' ? session.ecoCoins : session.estimatedEcoCoins}
          </div>
        </div>
      </div>

      {/* QR Code placeholder */}
      {session.qrCode && (
        <div className="mb-6 text-center">
          <div className="inline-block border-2 border-[#1A1A1A] p-4">
            <div className="w-32 h-32 bg-[#E8E6DD] flex items-center justify-center">
              <div className="text-xs text-[#4A4A4A]">{session.qrCode}</div>
            </div>
          </div>
          <div className="text-xs text-[#4A4A4A] mt-2">Presenta este código en el punto</div>
        </div>
      )}

      {/* Status stamp */}
      {showStamp && (
        <div className="absolute top-8 right-8">
          <StatusBadge status={session.status} variant="stamp" />
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[#1A1A1A] pt-4 text-xs text-[#4A4A4A] text-center">
        EcoTrade • Economía Circular • {new Date(session.createdAt).toLocaleDateString('es-ES')}
      </div>
    </div>
  );
};
