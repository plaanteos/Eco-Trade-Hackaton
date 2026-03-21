import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { SessionCard } from '../components/editorial/SessionCard';
import { EditorialButton } from '../components/editorial/EditorialButton';
import { useSession } from '../context/SessionContext';
import { SessionStatus } from '../types';
import { Search, Filter, Loader2 } from 'lucide-react';

const History: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'Todas'>('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { sessions, isLoading } = useSession();

  const filteredSessions = sessions.filter(session => {
    const matchesStatus = statusFilter === 'Todas' || session.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      session.sessionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.point.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statuses: (SessionStatus | 'Todas')[] = ['Todas', 'Programada', 'En curso', 'Pendiente de verificación', 'Completada', 'Cancelada', 'Borrador'];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <Loader2 className="w-12 h-12 mx-auto animate-spin text-[#2D5016] mb-4" />
        <p>Cargando sesiones...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="border-b-4 border-[#1A1A1A] pb-8 mb-12">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="mb-4">Historial de Sesiones</h1>
            <p className="text-lg text-[#4A4A4A]">
              Consulta todas tus sesiones de reciclaje, su estado y ecoCoins ganados.
            </p>
          </div>
          <EditorialButton 
            variant="primary" 
            size="lg"
            onClick={() => navigate('/crear/punto')}
          >
            Nueva Sesión
          </EditorialButton>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 bg-white border-2 border-[#1A1A1A] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-[#4A4A4A]" />
          <h3 className="text-sm uppercase tracking-wider">Filtros</h3>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A4A4A]" />
            <input
              type="text"
              placeholder="Buscar por número de sesión o punto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5016]"
            />
          </div>
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          {statuses.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-xs uppercase tracking-wider border-2 transition-all ${
                statusFilter === status
                  ? 'bg-[#1A1A1A] text-[#F5F3ED] border-[#1A1A1A]'
                  : 'bg-white text-[#1A1A1A] border-[#1A1A1A] hover:bg-[#E8E6DD]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="mb-6 text-sm text-[#4A4A4A]">
        {filteredSessions.length} {filteredSessions.length === 1 ? 'sesión encontrada' : 'sesiones encontradas'}
      </div>

      {/* Sessions list */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white border-2 border-[#1A1A1A] p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="mb-2">No se encontraron sesiones</h3>
          <p className="text-[#4A4A4A] mb-6">
            {searchTerm || statusFilter !== 'Todas' 
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Aún no has creado ninguna sesión de reciclaje'}
          </p>
          {searchTerm === '' && statusFilter === 'Todas' && (
            <EditorialButton 
              variant="primary"
              onClick={() => navigate('/crear/punto')}
            >
              Crear Primera Sesión
            </EditorialButton>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSessions.map(session => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
};

export default History;