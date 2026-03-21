import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../../context/SessionContext';
import { EditorialButton } from '../../components/editorial/EditorialButton';
import { Callout } from '../../components/editorial/Callout';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';

const CreateSessionDate: React.FC = () => {
  const navigate = useNavigate();
  const { draft, setDateTime } = useSession();
  const [selectedDate, setSelectedDate] = useState(draft.scheduledDate || '');
  const [selectedTime, setSelectedTime] = useState(draft.scheduledTime || '');

  // Redirect if prerequisites are missing
  useEffect(() => {
    if (!draft.point) {
      navigate('/crear/punto');
    }
  }, [draft.point, navigate]);

  if (!draft.point) {
    return null;
  }

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      setDateTime(selectedDate, selectedTime);
      navigate('/crear/materiales');
    }
  };

  const timeSlots = [
    '08:00-10:00',
    '10:00-12:00',
    '12:00-14:00',
    '14:00-16:00',
    '16:00-18:00',
  ];

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Get maximum date (30 days from now)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="border-b-4 border-[#1A1A1A] pb-8 mb-12">
        <div className="text-xs uppercase tracking-[0.3em] text-[#4A4A4A] mb-4">
          Paso 2 de 5
        </div>
        <h1 className="mb-4">Programar Fecha y Horario</h1>
        <p className="text-lg text-[#4A4A4A]">
          Selecciona cuándo entregarás tus materiales en{' '}
          <strong>{draft.point.name}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Point info reminder */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <div className="text-xs uppercase tracking-wider text-[#4A4A4A] mb-2">
              Horario del Punto
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#2D5016]" />
              <span className="font-medium">{draft.point.schedule}</span>
            </div>
          </div>

          {/* Date picker */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-[#4A4A4A]" />
              <h3 className="text-sm uppercase tracking-wider">Fecha de Entrega</h3>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              max={maxDateStr}
              className="w-full px-4 py-3 border-2 border-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5016] text-lg"
            />
            {selectedDate && (
              <div className="mt-3 text-sm text-[#4A4A4A]">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            )}
          </div>

          {/* Time slots */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#4A4A4A]" />
              <h3 className="text-sm uppercase tracking-wider">Franja Horaria</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {timeSlots.map(slot => (
                <button
                  key={slot}
                  onClick={() => setSelectedTime(slot)}
                  disabled={!selectedDate}
                  className={`px-4 py-3 border-2 transition-all text-sm font-medium ${
                    selectedTime === slot
                      ? 'bg-[#2D5016] text-[#F5F3ED] border-[#2D5016]'
                      : 'bg-white text-[#1A1A1A] border-[#1A1A1A] hover:bg-[#E8E6DD] disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Callout title="Instrucciones" variant="info">
            <ul className="text-sm space-y-2 list-disc list-inside">
              <li>Selecciona una fecha dentro de los próximos 30 días</li>
              <li>Elige una franja horaria que se ajuste al horario del punto</li>
              <li>No se aceptan entregas en fechas pasadas</li>
            </ul>
          </Callout>

          {selectedDate && selectedTime && (
            <div className="bg-[#E8F4E3] border-2 border-[#2D5016] p-6">
              <div className="text-xs uppercase tracking-wider text-[#2D5016] mb-2">
                Programación
              </div>
              <div className="mb-1 font-bold">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                })}
              </div>
              <div className="text-sm text-[#4A4A4A] mb-6">
                {selectedTime}
              </div>
              <div className="space-y-3">
                <EditorialButton
                  variant="primary"
                  size="lg"
                  onClick={handleContinue}
                  className="w-full flex items-center justify-center gap-2"
                >
                  Continuar
                  <ChevronRight className="w-5 h-5" />
                </EditorialButton>
                <EditorialButton
                  variant="outline"
                  size="md"
                  onClick={() => navigate('/crear/punto')}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Volver
                </EditorialButton>
              </div>
            </div>
          )}

          {(!selectedDate || !selectedTime) && (
            <EditorialButton
              variant="outline"
              size="md"
              onClick={() => navigate('/crear/punto')}
              className="w-full flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Volver
            </EditorialButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateSessionDate;