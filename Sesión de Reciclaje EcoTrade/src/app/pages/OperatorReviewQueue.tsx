import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { TrustScore } from '../components/editorial/TrustScore';
import { EditorialButton } from '../components/editorial/EditorialButton';
import { getReviewQueue, ReviewFilters, ReviewQueueItem } from '@/lib/operator';
import { Search, Filter, CheckCircle2, Loader2 } from 'lucide-react';

type FilterType = 'all' | 'low-trust' | 'high-kg' | 'no-evidence' | 'pending-onchain';

const OperatorReviewQueue: React.FC = () => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const filters: ReviewFilters = {};
      if (filterType === 'low-trust') filters.confianza = 'Baja';
      if (filterType === 'high-kg') filters.kgAlto = true;
      if (filterType === 'no-evidence') filters.sinEvidencia = true;
      if (filterType === 'pending-onchain') filters.pendienteOnChain = true;

      const items = await getReviewQueue(filters);
      setQueue(items);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [filterType]);

  const filteredItems = queue.filter(item => {
    if (searchTerm) {
      const pId = item.sessionNumber.toLowerCase();
      const pName = item.punto.toLowerCase();
      const term = searchTerm.toLowerCase();
      return pId.includes(term) || pName.includes(term);
    }
    return true;
  });

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'low-trust', label: 'Baja Confianza' },
    { key: 'high-kg', label: 'KG Alto' },
    { key: 'no-evidence', label: 'Sin Evidencia' },
    { key: 'pending-onchain', label: 'Pendiente on-chain' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
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
          {!isLoading && queue.length > 0 && (
            <div className="bg-[#FFF4E6] border-2 border-[#B85C00] px-6 py-3">
              <div className="text-xs uppercase tracking-wider text-[#B85C00] mb-1">
                Pendientes
              </div>
              <div className="text-4xl font-bold text-[#B85C00]" style={{ fontFamily: 'var(--font-serif)' }}>
                {queue.length}
              </div>
            </div>
          )}
        </div>
      </div>

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
              onClick={() => setFilterType(btn.key)}
              className={`px-4 py-2 border-2 text-sm uppercase tracking-wider transition-colors ${
                filterType === btn.key
                  ? 'bg-[#2D5016] border-[#2D5016] text-white'
                  : 'bg-white border-[#1A1A1A] text-[#1A1A1A] hover:border-[#2D5016]'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border-2 border-[#1A1A1A] p-12 text-center">
          <Loader2 className="w-16 h-16 text-[#2D5016] mx-auto mb-4 animate-spin" />
          <h2 className="mb-2">Cargando cola...</h2>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border-2 border-[#1A1A1A] p-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-[#2D5016] mx-auto mb-4" />
          <h2 className="mb-2">Sin Sesiones Pendientes</h2>
          <p className="text-[#4A4A4A]">
            No se encontraron sesiones con estos filtros.
          </p>
        </div>
      ) : (
        <div className="bg-white border-2 border-[#1A1A1A]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#1A1A1A] bg-[#E8E6DD]">
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-medium">Score</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-medium">Sesión</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-medium">Punto</th>
                  <th className="text-right p-4 text-xs uppercase tracking-wider font-medium">Total KG</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider font-medium">Fecha</th>
                  <th className="text-center p-4 text-xs uppercase tracking-wider font-medium">Estado</th>
                  <th className="text-center p-4 text-xs uppercase tracking-wider font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-[#E8E6DD] hover:bg-[#F5F3ED] transition-colors">
                    <td className="p-4">
                      {item.trustScore !== undefined && (
                        <TrustScore trustScore={{ score: item.trustScore, level: item.trustLevel as any, requiresReview: false, signals: [] }} compact />
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-mono font-bold">#{item.sessionNumber}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{item.punto}</div>
                    </td>
                    <td className="text-right p-4">
                      <div className="font-bold">{item.totalKg.toFixed(1)}</div>
                      <div className="text-xs text-[#4A4A4A]">KG</div>
                    </td>
                    <td className="p-4">
                      {item.scheduledDate && (
                        <div className="text-sm">
                          {new Date(item.scheduledDate + 'T00:00:00').toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </div>
                      )}
                    </td>
                    <td className="text-center p-4">
                      <span className={`inline-block px-3 py-1 border text-xs uppercase tracking-wider ${
                        item.status === 'Pendiente de verificación'
                          ? 'bg-[#FFF4E6] text-[#B85C00] border-[#B85C00]'
                          : 'bg-[#DBEAFE] text-[#1E40AF] border-[#1E40AF]'
                      }`}>
                        {item.status === 'Pendiente de verificación' ? 'Pendiente' : 'En Curso'}
                      </span>
                    </td>
                    <td className="text-center p-4">
                      <EditorialButton
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/operador/revisar/${item.id}`)}
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
