import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../../context/SessionContext';
import { EditorialButton } from '../../components/editorial/EditorialButton';
import { Callout } from '../../components/editorial/Callout';
import { COLLECTION_POINTS } from '../../data/mock-data';
import { CollectionPoint, MaterialType } from '../../types';
import { MapPin, Clock, Package, ChevronRight } from 'lucide-react';

const CreateSessionPoint: React.FC = () => {
  const navigate = useNavigate();
  const { draft, setPoint } = useSession();
  const [selectedPoint, setSelectedPoint] = useState<CollectionPoint | undefined>(draft.point);
  const [expandedPoint, setExpandedPoint] = useState<string | null>(null);

  const handleContinue = () => {
    if (selectedPoint) {
      setPoint(selectedPoint);
      navigate('/crear/fecha');
    }
  };

  const getMaterialBadge = (material: MaterialType) => {
    const colors: Record<MaterialType, string> = {
      'Plástico': 'bg-blue-100 text-blue-800 border-blue-800',
      'Vidrio': 'bg-green-100 text-green-800 border-green-800',
      'Papel y cartón': 'bg-amber-100 text-amber-800 border-amber-800',
      'Metal': 'bg-gray-100 text-gray-800 border-gray-800',
      'Electrónicos (RAEE)': 'bg-purple-100 text-purple-800 border-purple-800',
    };

    return (
      <span className={`inline-block px-2 py-1 text-xs border ${colors[material]}`}>
        {material}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="border-b-4 border-[#1A1A1A] pb-8 mb-12">
        <div className="text-xs uppercase tracking-[0.3em] text-[#4A4A4A] mb-4">
          Paso 1 de 5
        </div>
        <h1 className="mb-4">Seleccionar Punto de Acopio</h1>
        <p className="text-lg text-[#4A4A4A]">
          Elige el punto de acopio donde entregarás tus materiales reciclables.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Points list */}
        <div className="lg:col-span-2 space-y-4">
          {COLLECTION_POINTS.map(point => (
            <div
              key={point.id}
              className={`bg-white border-2 transition-all ${
                selectedPoint?.id === point.id
                  ? 'border-[#2D5016] shadow-lg'
                  : 'border-[#1A1A1A] hover:border-[#4A4A4A]'
              }`}
            >
              <div
                className="p-6 cursor-pointer"
                onClick={() => {
                  setSelectedPoint(point);
                  setExpandedPoint(expandedPoint === point.id ? null : point.id);
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="mb-2">{point.name}</h3>
                    <div className="flex items-start gap-2 text-sm text-[#4A4A4A] mb-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{point.address}</span>
                    </div>
                    {point.distance && (
                      <div className="text-xs text-[#4A4A4A]">
                        A {point.distance} de distancia
                      </div>
                    )}
                  </div>
                  <div className={`w-6 h-6 border-2 flex items-center justify-center ${
                    selectedPoint?.id === point.id
                      ? 'bg-[#2D5016] border-[#2D5016]'
                      : 'border-[#1A1A1A]'
                  }`}>
                    {selectedPoint?.id === point.id && (
                      <div className="w-3 h-3 bg-white" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm mb-3">
                  <Clock className="w-4 h-4 text-[#4A4A4A]" />
                  <span className="text-[#4A4A4A]">{point.schedule}</span>
                </div>

                {expandedPoint === point.id && (
                  <div className="mt-6 pt-6 border-t border-[#E8E6DD] space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-[#4A4A4A]" />
                        <span className="text-sm font-medium uppercase tracking-wider">
                          Materiales Aceptados
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {point.acceptedMaterials.map(material => (
                          <div key={material}>
                            {getMaterialBadge(material)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {point.limits && (
                      <div className="text-sm p-3 bg-[#FEF3C7] border border-[#92400E]">
                        <span className="font-medium">Límites: </span>
                        {point.limits}
                      </div>
                    )}

                    {point.instructions && (
                      <div className="text-sm p-3 border-l-2 border-[#2D5016] pl-3 text-[#4A4A4A]">
                        {point.instructions}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Callout title="Modalidad" variant="info">
            <p className="mb-3">
              <strong>Entrega en punto de acopio</strong>
            </p>
            <p className="text-xs">
              Debes llevar personalmente tus materiales al punto seleccionado. 
              No hay servicio de recolección a domicilio.
            </p>
          </Callout>

          <Callout title="Regla ecoCoins" variant="success">
            <div className="text-center py-4">
              <div className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                1 ecoCoin = 10 KG
              </div>
              <p className="text-xs">
                Por cada 10 kilogramos reciclados recibes 1 ecoCoin
              </p>
            </div>
          </Callout>

          {selectedPoint && (
            <div className="bg-[#E8F4E3] border-2 border-[#2D5016] p-6">
              <div className="text-xs uppercase tracking-wider text-[#2D5016] mb-2">
                Punto Seleccionado
              </div>
              <div className="font-bold mb-4">{selectedPoint.name}</div>
              <EditorialButton
                variant="primary"
                size="lg"
                onClick={handleContinue}
                className="w-full flex items-center justify-center gap-2"
              >
                Continuar
                <ChevronRight className="w-5 h-5" />
              </EditorialButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateSessionPoint;
