import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { MOCK_SESSIONS } from '../data/mock-data';
import { TrustScore } from '../components/editorial/TrustScore';
import { EditorialButton } from '../components/editorial/EditorialButton';
import { RecyclingSession } from '../types';
import { AlertTriangle, Search, Filter, CheckCircle2, XCircle } from 'lucide-react';

type FilterType = 'all' | 'low-trust' | 'high-kg' | 'no-evidence' | 'pending-onchain';

const OperatorReviewQueue: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter sessions that need review
  const sessionsNeedingReview = MOCK_SESSIONS.filter(s => 
    s.status === 'Pendiente de verificación' || 
    (s.status === 'En curso' && s.trustScore?.requiresReview)
  );

  // Apply filters
  const filteredSessions = sessionsNeedingReview.filter(session => {
    // Search filter
    if (searchTerm && !session.sessionNumber.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !session.point.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Type filters
    switch (filter) {
      case 'low-trust':
        return session.trustScore && session.trustScore.level === 'Baja';
      case 'high-kg':
        return session.totalKg > 100;
      case 'no-evidence':
        return !session.evidence || session.evidence.length === 0;
      case 'pending-onchain':
        return session.status === 'Pendiente de verificación';
      default:
        return true;
    }
  });

  const filterButtons: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'Todas', count: sessionsNeedingReview.length },
    { key: 'low-trust', label: 'Baja Confianza', count: sessionsNeedingReview.filter(s => s.trustScore?.level === 'Baja').length },
    { key: 'high-kg', label: 'KG Alto', count: sessionsNeedingReview.filter(s => s.totalKg > 100).length },
    { key: 'no-evidence', label: 'Sin Evidencia', count: sessionsNeedingReview.filter(s => !s.evidence || s.evidence.length === 0).length },
    { key: 'pending-onchain', label: 'Pendiente on-chain', count: sessionsNeedingReview.filter(s => s.status === 'Pendiente de verificación').length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="border-b-4 border-[#1A1A1A] pb-8 mb-12">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-[#4A4A4A] mb-2">
              Panel de Operador
            </div>
            <h1 className="mb-4">Cola de Revisión</h1>
            <p className="text-lg text-[#4A4A4A]">
              Sesiones que requieren verificación manual antes de emisión on-chain.
            </p>
          </div>
          {sessionsNeedingReview.length > 0 && (
            <div className="bg-[#FFF4E6] border-2 border-[#B85C00] px-6 py-3">
              <div className="text-xs uppercase tracking-wider text-[#B85C00] mb-1">
                Pendientes
              </div>
              <div className="text-4xl font-bold text-[#B85C00]" style={{ fontFamily: 'var(--font-serif)' }}>
                {sessionsNeedingReview.length}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white border-2 border-[#1A1A1A] p-6 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A4A4A]" />
            <input
              type="text"
              placeholder="Buscar por número de sesión o punto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5016]"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-[#4A4A4A]">
            <Filter className="w-4 h-4" />
            <span className="uppercase tracking-wider">Filtros:</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`px-4 py-2 border-2 text-sm uppercase tracking-wider transition-colors ${
                filter === btn.key
                  ? 'bg-[#2D5016] border-[#2D5016] text-white'
                  : 'bg-white border-[#1A1A1A] text-[#1A1A1A] hover:border-[#2D5016]'
              }`}
            >
              {btn.label}
              {btn.count !== undefined && (
                <span className="ml-2 font-bold">({btn.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions table */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white border-2 border-[#1A1A1A] p-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-[#2D5016] mx-auto mb-4" />
          <h2 className="mb-2">Sin Sesiones Pendientes</h2>
          <p className="text-[#4A4A4A]">
            {filter === 'all' 
              ? 'No hay sesiones que requieran revisión en este momento.'
              : 'No se encontraron sesiones con este filtro.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border-2 border-[#1A1A1A]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#1A1A1A] bg-[#E8E6DD]">
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-medium">
                    Score
                  </th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-medium">
                    Sesión
                  </th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-medium">
                    Punto
                  </th>
                  <th className="text-right p-4 text-xs uppercase tracking-wider font-medium">
                    Total KG
                  </th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-medium">
                    Fecha
                  </th>
                  <th className="text-center p-4 text-xs uppercase tracking-wider font-medium">
                    Estado
                  </th>
                  <th className="text-center p-4 text-xs uppercase tracking-wider font-medium">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <tr 
                    key={session.id} 
                    className="border-b border-[#E8E6DD] hover:bg-[#F5F3ED] transition-colors"
                  >
                    <td className="p-4">
                      {session.trustScore && (
                        <TrustScore trustScore={session.trustScore} compact />
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-mono font-bold">#{session.sessionNumber}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{session.point.name}</div>
                      <div className="text-xs text-[#4A4A4A]">{session.point.address}</div>
                    </td>
                    <td className="text-right p-4">
                      <div className="font-bold">{session.totalKg.toFixed(1)}</div>
                      <div className="text-xs text-[#4A4A4A]">KG</div>
                    </td>
                    <td className="p-4">
                      {session.scheduledDate && (
                        <div className="text-sm">
                          {new Date(session.scheduledDate + 'T00:00:00').toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </div>
                      )}
                    </td>
                    <td className="text-center p-4">
                      <span className={`inline-block px-3 py-1 border text-xs uppercase tracking-wider ${
                        session.status === 'Pendiente de verificación'
                          ? 'bg-[#FFF4E6] text-[#B85C00] border-[#B85C00]'
                          : 'bg-[#DBEAFE] text-[#1E40AF] border-[#1E40AF]'
                      }`}>
                        {session.status === 'Pendiente de verificación' ? 'Pendiente' : 'En Curso'}
                      </span>
                    </td>
                    <td className="text-center p-4">
                      <EditorialButton
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/operador/revisar/${session.id}`)}
                      >
                        Revisar
                      </EditorialButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 bg-[#F5F3ED] border border-[#E8E6DD] p-6">
        <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-4">
          Leyenda
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-bold mb-1">Confianza Alta (80-100)</div>
            <div className="text-[#4A4A4A]">Revisión rápida recomendada</div>
          </div>
          <div>
            <div className="font-bold mb-1">Confianza Media (50-79)</div>
            <div className="text-[#4A4A4A]">Requiere verificación estándar</div>
          </div>
          <div>
            <div className="font-bold mb-1">Confianza Baja (&lt;50)</div>
            <div className="text-[#4A4A4A]">Revisión detallada obligatoria</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorReviewQueue;
