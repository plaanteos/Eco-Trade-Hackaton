import React from 'react';
import { EditorialButton } from './EditorialButton';
import { Loader2, AlertCircle, FileX } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Cargando...' }) => {
  return (
    <div className="bg-white border-2 border-[#1A1A1A] p-12 text-center">
      <Loader2 className="w-12 h-12 text-[#4A4A4A] mx-auto mb-4 animate-spin" />
      <p className="text-lg font-medium">{message}</p>
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  message, 
  actionLabel,
  onAction 
}) => {
  return (
    <div className="bg-white border-2 border-[#1A1A1A] p-12 text-center">
      <FileX className="w-16 h-16 text-[#4A4A4A] mx-auto mb-4 opacity-50" />
      <h3 className="mb-3">{title}</h3>
      <p className="text-[#4A4A4A] mb-6 max-w-md mx-auto">{message}</p>
      {actionLabel && onAction && (
        <EditorialButton variant="primary" onClick={onAction}>
          {actionLabel}
        </EditorialButton>
      )}
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  title = 'Error', 
  message,
  onRetry 
}) => {
  return (
    <div className="bg-[#FEE2E2] border-2 border-[#991B1B] p-12 text-center">
      <AlertCircle className="w-16 h-16 text-[#991B1B] mx-auto mb-4" />
      <h3 className="mb-3 text-[#991B1B]">{title}</h3>
      <p className="text-[#991B1B] mb-6 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <EditorialButton variant="primary" onClick={onRetry}>
          Reintentar
        </EditorialButton>
      )}
    </div>
  );
};

interface OfflineStateProps {
  onSaveDraft?: () => void;
}

export const OfflineState: React.FC<OfflineStateProps> = ({ onSaveDraft }) => {
  return (
    <div className="bg-[#FEF3C7] border-2 border-[#92400E] p-8">
      <div className="flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-[#92400E] flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h4 className="mb-2 text-[#92400E]">Sin Conexión</h4>
          <p className="text-sm text-[#92400E] mb-4">
            No se pudo conectar con el servidor. Verifica tu conexión a internet.
          </p>
          {onSaveDraft && (
            <EditorialButton variant="outline" size="sm" onClick={onSaveDraft}>
              Guardar Borrador
            </EditorialButton>
          )}
        </div>
      </div>
    </div>
  );
};
