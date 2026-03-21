import React from 'react';
import { SessionTimeline } from '../../types';
import { StatusBadge } from './StatusBadge';

interface TimelineProps {
  timeline: SessionTimeline[];
}

export const Timeline: React.FC<TimelineProps> = ({ timeline }) => {
  return (
    <div className="border-l-2 border-[#1A1A1A] pl-6 space-y-6">
      {timeline.map((entry, idx) => (
        <div key={idx} className="relative">
          <div className="absolute -left-[29px] top-1 w-4 h-4 bg-[#2D5016] border-2 border-[#1A1A1A]" />
          
          <div className="mb-2">
            <StatusBadge status={entry.status} />
          </div>
          
          <div className="text-sm text-[#4A4A4A] mb-1">
            {entry.timestamp.toLocaleString('es-ES', { 
              day: 'numeric',
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          
          {entry.actor && (
            <div className="text-sm font-medium mb-1">
              {entry.actor}
            </div>
          )}
          
          {entry.note && (
            <div className="text-sm text-[#4A4A4A] italic border-l-2 border-[#E8E6DD] pl-3 mt-2">
              {entry.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
