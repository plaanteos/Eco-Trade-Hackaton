import React from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { EditorialButton } from '../components/editorial/EditorialButton';
import { Callout } from '../components/editorial/Callout';
import { MOCK_SESSIONS } from '../data/mock-data';
import { Leaf, Award, MapPin, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Calcular estadísticas
  const completedSessions = MOCK_SESSIONS.filter(s => s.status === 'Completada');
  const pendingReview = MOCK_SESSIONS.filter(s => s.status === 'Pendiente de verificación');
  const inProgress = MOCK_SESSIONS.filter(s => s.status === 'En curso');
  const totalEcoCoins = completedSessions.reduce((sum, s) => sum + s.ecoCoins, 0);
  const totalKg = completedSessions.reduce((sum, s) => sum + s.totalKg, 0);

  const isOperador = user?.role === 'Operador';

  if (isOperador) {
    // Vista para Operador
    return (
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Hero Operador */}
        <div className="border-b-4 border-[#1A1A1A] pb-12 mb-12">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.3em] text-[#4A4A4A] mb-4">
              Panel de Operador — {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h1 className="mb-6 leading-tight">
              Bienvenido, {user?.name}
            </h1>
            <p className="text-xl text-[#4A4A4A] leading-relaxed mb-8" style={{ fontFamily: 'var(--font-sans)' }}>
              Gestiona la cola de revisión, verifica entregas y emite recibos verificables en blockchain.
            </p>
            <div className="flex flex-wrap gap-4">
              <EditorialButton 
                variant="primary" 
                size="lg"
                onClick={() => navigate('/operador/cola')}
              >
                Cola de Revisión
              </EditorialButton>
              <EditorialButton 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/historial')}
              >
                Todas las Sesiones
              </EditorialButton>
            </div>
          </div>
        </div>

        {/* Stats Grid Operador */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#FFF4E6] border-2 border-[#B85C00] p-8">
            <div className="flex items-start justify-between mb-4">
              <AlertTriangle className="w-8 h-8 text-[#B85C00]" />
              <div className="text-4xl font-bold text-[#B85C00]" style={{ fontFamily: 'var(--font-serif)' }}>
                {pendingReview.length}
              </div>
            </div>
            <div className="text-sm uppercase tracking-wider text-[#4A4A4A]">
              Pendientes de Verificación
            </div>
          </div>

          <div className="bg-[#DBEAFE] border-2 border-[#1E40AF] p-8">
            <div className="flex items-start justify-between mb-4">
              <Clock className="w-8 h-8 text-[#1E40AF]" />
              <div className="text-4xl font-bold text-[#1E40AF]" style={{ fontFamily: 'var(--font-serif)' }}>
                {inProgress.length}
              </div>
            </div>
            <div className="text-sm uppercase tracking-wider text-[#4A4A4A]">
              En Curso
            </div>
          </div>

          <div className="bg-[#D1FAE5] border-2 border-[#065F46] p-8">
            <div className="flex items-start justify-between mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#065F46]" />
              <div className="text-4xl font-bold text-[#065F46]" style={{ fontFamily: 'var(--font-serif)' }}>
                {completedSessions.length}
              </div>
            </div>
            <div className="text-sm uppercase tracking-wider text-[#4A4A4A]">
              Verificadas y Completadas
            </div>
          </div>
        </div>

        {/* Alerts para operador */}
        {pendingReview.length > 0 && (
          <Callout title="Sesiones Requieren Atención" variant="warning">
            <p className="text-sm mb-4">
              Hay {pendingReview.length} {pendingReview.length === 1 ? 'sesión' : 'sesiones'} pendientes de verificación antes de emitir recibo on-chain.
            </p>
            <EditorialButton
              variant="primary"
              size="md"
              onClick={() => navigate('/operador/cola')}
            >
              Ver Cola de Revisión
            </EditorialButton>
          </Callout>
        )}
      </div>
    );
  }

  // Vista para Usuario Normal
  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      {/* Hero Editorial */}
      <div className="border-b-4 border-[#1A1A1A] pb-12 mb-12">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.3em] text-[#4A4A4A] mb-4">
            Viernes, 6 de Marzo de 2026
          </div>
          <h1 className="mb-6 leading-tight">
            Sesiones de Reciclaje
          </h1>
          <p className="text-xl text-[#4A4A4A] leading-relaxed mb-8" style={{ fontFamily: 'var(--font-sans)' }}>
            Crea una sesión de reciclaje, entrega tus materiales en puntos de acopio certificados 
            y gana ecoCoins por cada kilogramo reciclado. Contribuye a la economía circular.
          </p>
          <div className="flex flex-wrap gap-4">
            <EditorialButton 
              variant="primary" 
              size="lg"
              onClick={() => navigate('/crear/punto')}
            >
              Crear Sesión
            </EditorialButton>
            <EditorialButton 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/historial')}
            >
              Ver Historial
            </EditorialButton>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white border-2 border-[#1A1A1A] p-8">
          <div className="flex items-start justify-between mb-4">
            <Award className="w-8 h-8 text-[#2D5016]" />
            <div className="text-4xl font-bold text-[#2D5016]" style={{ fontFamily: 'var(--font-serif)' }}>
              {totalEcoCoins}
            </div>
          </div>
          <div className="text-sm uppercase tracking-wider text-[#4A4A4A]">
            ecoCoins Ganados
          </div>
        </div>

        <div className="bg-white border-2 border-[#1A1A1A] p-8">
          <div className="flex items-start justify-between mb-4">
            <Leaf className="w-8 h-8 text-[#2D5016]" />
            <div className="text-4xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
              {totalKg.toFixed(0)}
            </div>
          </div>
          <div className="text-sm uppercase tracking-wider text-[#4A4A4A]">
            KG Reciclados
          </div>
        </div>

        <div className="bg-white border-2 border-[#1A1A1A] p-8">
          <div className="flex items-start justify-between mb-4">
            <MapPin className="w-8 h-8 text-[#2D5016]" />
            <div className="text-4xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
              {completedSessions.length}
            </div>
          </div>
          <div className="text-sm uppercase tracking-wider text-[#4A4A4A]">
            Sesiones Completadas
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="mb-12">
        <h2 className="mb-8 pb-4 border-b-2 border-[#1A1A1A]">
          Cómo Funciona
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Callout title="1. Crea tu Sesión" variant="info">
            <p className="mb-3">
              Selecciona un punto de acopio cercano, programa la fecha de entrega y registra 
              los materiales que vas a reciclar en kilogramos.
            </p>
            <p className="text-xs text-[#4A4A4A]">
              Materiales: Plástico, Vidrio, Papel y cartón, Metal, Electrónicos (RAEE)
            </p>
          </Callout>

          <Callout title="2. Entrega en Punto" variant="info">
            <p className="mb-3">
              Lleva tus materiales al punto de acopio en la fecha programada. 
              Presenta el código QR de tu sesión al operador.
            </p>
            <p className="text-xs text-[#4A4A4A]">
              Respeta los horarios y límites de cada punto
            </p>
          </Callout>

          <Callout title="3. Verificación" variant="info">
            <p className="mb-3">
              El operador del punto verificará y pesará tus materiales. 
              Los kilogramos finales pueden ajustarse durante la verificación.
            </p>
          </Callout>

          <Callout title="4. Gana ecoCoins" variant="success">
            <p className="mb-3">
              Recibe 1 ecoCoin por cada 10 KG reciclados. 
              Consulta tu historial y descarga el recibo de cada sesión.
            </p>
            <div className="mt-4 p-3 bg-white border border-[#2D5016]">
              <div className="text-xs uppercase tracking-wider text-[#2D5016] mb-1">Regla</div>
              <div className="font-bold">1 ecoCoin = 10 KG</div>
            </div>
          </Callout>
        </div>
      </div>

      {/* Recent sessions */}
      <div>
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-[#1A1A1A]">
          <h2>Actividad Reciente</h2>
          <EditorialButton 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/historial')}
          >
            Ver Todo
          </EditorialButton>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {MOCK_SESSIONS.slice(0, 3).map(session => (
            <div 
              key={session.id}
              onClick={() => navigate(`/sesion/${session.id}`)}
              className="bg-white border border-[#1A1A1A] p-4 hover:border-[#2D5016] transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold">No. {session.sessionNumber}</span>
                    <span className="text-xs px-2 py-1 border border-[#1A1A1A] uppercase tracking-wider">
                      {session.status}
                    </span>
                  </div>
                  <div className="text-sm text-[#4A4A4A]">
                    {session.point.name} • {session.totalKg.toFixed(1)} KG
                  </div>
                </div>
                <div className="text-right">
                  {session.status === 'Completada' && (
                    <div className="text-2xl font-bold text-[#2D5016]">
                      {session.ecoCoins}
                      <span className="text-sm ml-1">ecoCoins</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Landing;