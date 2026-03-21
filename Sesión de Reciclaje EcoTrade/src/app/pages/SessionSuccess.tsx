import React from 'react';
import { useParams, useNavigate } from 'react-router';
import { EditorialButton } from '../components/editorial/EditorialButton';
import { Ticket } from '../components/editorial/Ticket';
import { MOCK_SESSIONS } from '../data/mock-data';
import { CheckCircle2, Download, ArrowRight } from 'lucide-react';

const SessionSuccess: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // In a real app, we'd fetch the session by ID
  // For demo, we'll use a programmed session
  const session = MOCK_SESSIONS.find(s => s.status === 'Programada') || MOCK_SESSIONS[1];

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      {/* Success header */}
      <div className="text-center mb-12">
        <div className="inline-block p-6 mb-6">
          <CheckCircle2 className="w-20 h-20 text-[#2D5016]" />
        </div>
        <h1 className="mb-4 text-[#2D5016]">¡Sesión Creada!</h1>
        <p className="text-xl text-[#4A4A4A] max-w-2xl mx-auto">
          Tu sesión de reciclaje ha sido programada exitosamente. 
          Guarda o imprime el siguiente ticket para presentarlo en el punto de acopio.
        </p>
      </div>

      {/* Ticket */}
      <div className="mb-12 max-w-2xl mx-auto">
        <Ticket session={session} showStamp />
      </div>

      {/* Actions */}
      <div className="max-w-2xl mx-auto space-y-4 mb-12">
        <EditorialButton
          variant="outline"
          size="lg"
          className="w-full flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Descargar Ticket (PDF)
        </EditorialButton>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditorialButton
            variant="primary"
            size="md"
            onClick={() => navigate(`/sesion/${session.id}`)}
            className="w-full flex items-center justify-center gap-2"
          >
            Ver Detalle
            <ArrowRight className="w-5 h-5" />
          </EditorialButton>
          <EditorialButton
            variant="outline"
            size="md"
            onClick={() => navigate('/historial')}
            className="w-full"
          >
            Ir al Historial
          </EditorialButton>
        </div>
      </div>

      {/* Next steps */}
      <div className="max-w-2xl mx-auto bg-white border-2 border-[#1A1A1A] p-8">
        <h3 className="mb-6 pb-4 border-b-2 border-[#1A1A1A]">
          Próximos Pasos
        </h3>
        <ol className="space-y-4">
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#2D5016] text-[#F5F3ED] flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <div className="font-semibold mb-1">Prepara tus materiales</div>
              <div className="text-sm text-[#4A4A4A]">
                Limpia y separa los materiales según el tipo. Respeta los límites del punto.
              </div>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#2D5016] text-[#F5F3ED] flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <div className="font-semibold mb-1">Acude al punto en la fecha programada</div>
              <div className="text-sm text-[#4A4A4A]">
                {session.scheduledDate && new Date(session.scheduledDate).toLocaleDateString('es-ES', { 
                  day: 'numeric', 
                  month: 'long' 
                })}
                {' • '}
                {session.scheduledTime}
              </div>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#2D5016] text-[#F5F3ED] flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <div className="font-semibold mb-1">Presenta el código QR</div>
              <div className="text-sm text-[#4A4A4A]">
                El operador escaneará tu código y verificará los materiales.
              </div>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#2D5016] text-[#F5F3ED] flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <div className="font-semibold mb-1">Recibe tus ecoCoins</div>
              <div className="text-sm text-[#4A4A4A]">
                Una vez completada la verificación, los ecoCoins se acreditarán automáticamente.
              </div>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
};

export default SessionSuccess;
