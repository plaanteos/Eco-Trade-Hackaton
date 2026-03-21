import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../../context/SessionContext';
import { EditorialButton } from '../../components/editorial/EditorialButton';
import { Callout } from '../../components/editorial/Callout';
import { ChevronLeft, ChevronRight, Plus, Minus, Package, Trash2 } from 'lucide-react';
import { materialTypes, type MaterialType, type Material } from '../../data/mock-data';

const CreateSessionMaterials: React.FC = () => {
  const navigate = useNavigate();
  const { draft, setMaterials, getEstimatedEcoCoins, getTotalKg } = useSession();

  // Redirect if prerequisites are missing
  useEffect(() => {
    if (!draft.point || !draft.scheduledDate) {
      navigate('/crear/punto');
    }
  }, [draft.point, draft.scheduledDate, navigate]);

  if (!draft.point || !draft.scheduledDate) {
    return null;
  }

  const [materials, setMaterialsState] = useState<Material[]>(
    draft.materials.length > 0 
      ? draft.materials 
      : [{ type: 'Plástico', kg: 0 }]
  );

  const availableMaterials: MaterialType[] = draft.point.acceptedMaterials;

  const addMaterial = () => {
    const usedTypes = new Set(materials.map(m => m.type));
    const availableType = availableMaterials.find(t => !usedTypes.has(t));
    if (availableType) {
      setMaterialsState([...materials, { type: availableType, kg: 0 }]);
    }
  };

  const removeMaterial = (index: number) => {
    if (materials.length > 1) {
      setMaterialsState(materials.filter((_, i) => i !== index));
    }
  };

  const updateMaterial = (index: number, field: keyof Material, value: any) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };
    setMaterialsState(updated);
  };

  const handleContinue = () => {
    const validMaterials = materials.filter(m => m.kg > 0);
    if (validMaterials.length > 0) {
      setMaterials(validMaterials);
      navigate('/crear/evidencia');
    }
  };

  const totalKg = materials.reduce((sum, m) => sum + m.kg, 0);
  const estimatedEcoCoins = Math.floor(totalKg / 10);
  const hasValidMaterials = materials.some(m => m.kg > 0);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="border-b-4 border-[#1A1A1A] pb-8 mb-12">
        <div className="text-xs uppercase tracking-[0.3em] text-[#4A4A4A] mb-4">
          Paso 3 de 5
        </div>
        <h1 className="mb-4">Registrar Materiales</h1>
        <p className="text-lg text-[#4A4A4A]">
          Ingresa los materiales que vas a reciclar y su peso en kilogramos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Materials table */}
          <div className="bg-white border-2 border-[#1A1A1A]">
            <div className="p-6 border-b-2 border-[#1A1A1A]">
              <h3 className="text-sm uppercase tracking-wider">Inventario de Materiales</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#1A1A1A] bg-[#E8E6DD]">
                    <th className="text-left p-4 text-xs uppercase tracking-wider font-medium">
                      Material
                    </th>
                    <th className="text-right p-4 text-xs uppercase tracking-wider font-medium">
                      Kilogramos
                    </th>
                    <th className="text-left p-4 text-xs uppercase tracking-wider font-medium">
                      Observación
                    </th>
                    <th className="w-16 p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((material, index) => (
                    <tr key={index} className="border-b border-[#E8E6DD]">
                      <td className="p-4">
                        <select
                          value={material.type}
                          onChange={(e) => updateMaterial(index, 'type', e.target.value as MaterialType)}
                          className="w-full px-3 py-2 border border-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5016]"
                        >
                          {availableMaterials.map(type => (
                            <option 
                              key={type} 
                              value={type}
                              disabled={materials.some((m, i) => i !== index && m.type === type)}
                            >
                              {type}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={material.kg || ''}
                          onChange={(e) => updateMaterial(index, 'kg', parseFloat(e.target.value) || 0)}
                          placeholder="0.0"
                          className="w-full px-3 py-2 border border-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5016] text-right font-medium"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={material.observation || ''}
                          onChange={(e) => updateMaterial(index, 'observation', e.target.value)}
                          placeholder="Opcional"
                          className="w-full px-3 py-2 border border-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5016] text-sm"
                        />
                      </td>
                      <td className="p-4">
                        {materials.length > 1 && (
                          <button
                            onClick={() => removeMaterial(index)}
                            className="p-2 hover:bg-[#FEE2E2] transition-colors"
                            title="Eliminar material"
                          >
                            <Trash2 className="w-4 h-4 text-[#991B1B]" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#1A1A1A] bg-[#E8E6DD]">
                    <td className="p-4 font-bold uppercase tracking-wider text-sm">
                      Total
                    </td>
                    <td className="p-4 text-right font-bold text-lg">
                      {totalKg.toFixed(1)} KG
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {materials.length < availableMaterials.length && (
              <div className="p-4 border-t border-[#E8E6DD]">
                <EditorialButton
                  variant="outline"
                  size="sm"
                  onClick={addMaterial}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Material
                </EditorialButton>
              </div>
            )}
          </div>

          {/* Validation message */}
          {!hasValidMaterials && (
            <div className="bg-[#FEF3C7] border-2 border-[#92400E] p-4 text-sm">
              <strong>Atención:</strong> Debes registrar al menos un material con peso mayor a 0 KG.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Callout title="Materiales Aceptados" variant="info">
            <div className="space-y-2">
              {draft.point.acceptedMaterials.map(material => (
                <div key={material} className="text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#2D5016]" />
                  {material}
                </div>
              ))}
            </div>
          </Callout>

          {draft.point.limits && (
            <Callout title="Límites del Punto" variant="warning">
              <p className="text-sm">{draft.point.limits}</p>
            </Callout>
          )}

          {/* EcoCoins estimate */}
          <div className="bg-[#E8F4E3] border-2 border-[#2D5016] p-6">
            <div className="text-xs uppercase tracking-wider text-[#2D5016] mb-3">
              ecoCoins Estimados
            </div>
            <div className="text-center py-4 mb-4 border-y-2 border-[#2D5016]">
              <div className="text-5xl font-bold text-[#2D5016]" style={{ fontFamily: 'var(--font-serif)' }}>
                {estimatedEcoCoins}
              </div>
            </div>
            <div className="text-xs text-center mb-6">
              {totalKg.toFixed(1)} KG ÷ 10 = {estimatedEcoCoins} ecoCoin{estimatedEcoCoins !== 1 ? 's' : ''}
            </div>

            <div className="space-y-3">
              <EditorialButton
                variant="primary"
                size="lg"
                onClick={handleContinue}
                disabled={!hasValidMaterials}
                className="w-full flex items-center justify-center gap-2"
              >
                Continuar
                <ChevronRight className="w-5 h-5" />
              </EditorialButton>
              <EditorialButton
                variant="outline"
                size="md"
                onClick={() => navigate('/crear/fecha')}
                className="w-full flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Volver
              </EditorialButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSessionMaterials;