import React from 'react';
import { useNavigate } from 'react-router';
import { EditorialButton } from '../components/editorial/EditorialButton';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-[12rem] leading-none mb-0" style={{ fontFamily: 'var(--font-serif)' }}>
            404
          </h1>
        </div>

        {/* Message */}
        <div className="border-t-4 border-b-4 border-[#1A1A1A] py-8 mb-8">
          <h2 className="mb-4">Página No Encontrada</h2>
          <p className="text-lg text-[#4A4A4A]">
            La página que buscas no existe o ha sido movida. 
            Verifica la URL o vuelve al inicio.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <EditorialButton
            variant="primary"
            size="lg"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            Ir al Inicio
          </EditorialButton>
          <EditorialButton
            variant="outline"
            size="lg"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </EditorialButton>
        </div>

        {/* Decorative element */}
        <div className="mt-16 pt-8 border-t-2 border-[#E8E6DD]">
          <p className="text-sm text-[#4A4A4A] italic">
            "No todo lo que parece perdido, está perdido" — EcoTrade Editorial
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
