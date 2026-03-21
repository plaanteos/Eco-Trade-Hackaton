// ============================================================
//  EcoTrade — ProtectedRoute
//  src/app/components/ProtectedRoute.tsx
//
//  HOC/wrapper que verifica autenticación y permisos de role.
//  - Si no está autenticado → redirect a /login
//  - Si no tiene el role correcto → redirect a /
//  - Muestra spinner mientras se resuelve la sesión inicial
// ============================================================

import React, { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { Loader2 } from 'lucide-react';

// ─── Spinner de carga ────────────────────────────────────────
const LoadingScreen: React.FC = () => (
  <div
    className="min-h-screen flex items-center justify-center"
    style={{ backgroundColor: '#F5F3ED' }}
    aria-label="Cargando sesión"
    role="status"
  >
    <div className="flex flex-col items-center gap-4">
      <Loader2
        className="w-10 h-10 animate-spin"
        style={{ color: '#2D5016' }}
      />
      <p
        className="text-sm uppercase tracking-widest"
        style={{ color: '#4A4A4A' }}
      >
        Verificando sesión…
      </p>
    </div>
  </div>
);

// ─── Props ───────────────────────────────────────────────────
interface ProtectedRouteProps {
  children: ReactNode;
  /** Roles que pueden acceder. Undefined = cualquier rol autenticado. */
  allowedRoles?: UserRole[];
}

// ─── Componente ──────────────────────────────────────────────
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  // Mientras Supabase resuelve la sesión inicial, mostrar spinner
  if (isLoading) return <LoadingScreen />;

  // No autenticado → /login (guardando el destino original)
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // Autenticado pero sin el role requerido → home
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// ─── Helpers de conveniencia ─────────────────────────────────

/** Ruta que sólo pueden ver Operadores */
export const OperatorRoute: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['Operador']}>{children}</ProtectedRoute>
);

/** Ruta que sólo pueden ver Usuarios regulares */
export const UserRoute: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['Usuario']}>{children}</ProtectedRoute>
);
