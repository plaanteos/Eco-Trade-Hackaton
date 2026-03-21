import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../../context/SessionContext';
import { EditorialButton } from '../../components/editorial/EditorialButton';
import { Callout } from '../../components/editorial/Callout';
import { ChevronLeft, ChevronRight, Upload, ImageIcon } from 'lucide-react';

const CreateSessionEvidence: React.FC = () => {
  const navigate = useNavigate();
  const { draft, addEvidence } = useSession();
  const [evidenceNote, setEvidenceNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Redirect if prerequisites are missing
  useEffect(() => {
    if (!draft.point || !draft.scheduledDate || draft.materials.length === 0) {
      navigate('/crear/punto');
    }
  }, [draft.point, draft.scheduledDate, draft.materials.length, navigate]);

  // Handle object URLs for previews to prevent memory leaks
  useEffect(() => {
    const urls = draft.evidence.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [draft.evidence]);

  if (!draft.point || !draft.scheduledDate || draft.materials.length === 0) {
    return null;
  }

  const handleContinue = () => {
    // Evidence is optional, so we can continue regardless
    navigate('/crear/resumen');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addEvidence(Array.from(e.target.files));
      // Reset input value to allow selecting the same file again if needed
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addEvidence(Array.from(e.dataTransfer.files));
    }
  };

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="border-b-4 border-[#1A1A1A] pb-8 mb-12">
        <div className="text-xs uppercase tracking-[0.3em] text-[#4A4A4A] mb-4">
          Paso 4 de 5
        </div>
        <h1 className="mb-4">Evidencia Fotográfica</h1>
        <p className="text-lg text-[#4A4A4A]">
          Opcional: Agrega fotografías de tus materiales preparados para reciclaje.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Upload area */}
          <div className="bg-white border-2 border-[#1A1A1A] p-8">
            <div 
              className={`border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
                isDragging ? 'border-[#2D5016] bg-[#2D5016]/5' : 'border-[#4A4A4A]'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleSelectClick}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                multiple 
                accept="image/jpeg, image/png, image/webp"
              />
              <Upload className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-[#2D5016]' : 'text-[#4A4A4A]'}`} />
              <h3 className="mb-2">Subir Fotografías</h3>
              <p className="text-sm text-[#4A4A4A] mb-6">
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <EditorialButton variant="outline" size="md" onClick={(e) => {
                e.stopPropagation();
                handleSelectClick();
              }}>
                Seleccionar Archivos
              </EditorialButton>
              <p className="text-xs text-[#4A4A4A] mt-4">
                Formatos: JPG, PNG • Máximo 5 MB por archivo
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <label className="block mb-3 text-sm uppercase tracking-wider">
              Notas o Comentarios (Opcional)
            </label>
            <textarea
              value={evidenceNote}
              onChange={(e) => setEvidenceNote(e.target.value)}
              placeholder="Agrega información adicional sobre los materiales..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5016] resize-none"
            />
          </div>

          {/* Preview area */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6">
            <h3 className="mb-4 text-sm uppercase tracking-wider">
              Vista Previa
            </h3>
            {draft.evidence.length === 0 ? (
              <div className="border border-[#E8E6DD] p-8 text-center text-[#4A4A4A]">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No se han subido fotografías aún</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {draft.evidence.map((file, idx) => (
                  <div key={idx} className="relative group border-2 border-[#1A1A1A] overflow-hidden aspect-square">
                    <img 
                      src={previewUrls[idx]} 
                      alt={`Evidencia ${idx + 1}`} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-xs font-bold px-2 text-center truncate w-full">
                        {file.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Callout title="¿Por qué evidencia?" variant="info">
            <p className="text-sm mb-3">
              Las fotografías ayudan al operador a prepararse para la recepción 
              y verificar que los materiales cumplen con los estándares del punto.
            </p>
            <p className="text-xs text-[#4A4A4A]">
              La evidencia fotográfica es <strong>opcional</strong> pero recomendada.
            </p>
          </Callout>

          <Callout title="Recomendaciones" variant="info">
            <ul className="text-sm space-y-2 list-disc list-inside">
              <li>Fotografía clara de los materiales</li>
              <li>Materiales limpios y separados</li>
              <li>Muestra la cantidad aproximada</li>
              <li>Evita información personal en las fotos</li>
            </ul>
          </Callout>

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
              onClick={() => navigate('/crear/materiales')}
              className="w-full flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Volver
            </EditorialButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateSessionEvidence;