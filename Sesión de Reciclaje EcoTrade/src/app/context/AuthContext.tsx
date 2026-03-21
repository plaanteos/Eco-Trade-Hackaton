// ============================================================
//  EcoTrade — AuthContext
//  src/app/context/AuthContext.tsx
//
//  Reemplaza el mock anterior. Usa useAlchemyAuth internamente.
//  Expone: user, role, walletAddress, login, logout, isAuthenticated
// ============================================================

import React, {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAlchemyAuth, type AlchemyAuthUser } from '@/hooks/useAlchemyAuth';
import type { UserRole } from '../types';

// ─── Tipos ───────────────────────────────────────────────────

export interface AuthContextUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface AuthContextType {
  /** Usuario autenticado (null si no hay sesión) */
  user: AuthContextUser | null;
  /** Shortcut al role del usuario */
  role: UserRole | null;
  /** Dirección Solana derivada del usuario */
  walletAddress: string | null;
  /** Datos completos del usuario Alchemy */
  alchemyUser: AlchemyAuthUser | null;
  /** Inicia Google OAuth (alias de signInWithGoogle) */
  login: () => Promise<void>;
  /** Cierra sesión */
  logout: () => Promise<void>;
  /** true si hay sesión activa */
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ─── Rutas que NO requieren autenticación ─────────────────────
// Importante: /auth/callback debe ser pública para no interrumpir
// el intercambio de sesión de OAuth (race condition con detectSessionInUrl).
const PUBLIC_PATHS = ['/login', '/auth/callback', '/verificar'];

// ─── Context ─────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    user: alchemyUser,
    walletAddress,
    signInWithGoogle,
    signOut,
    isLoading,
    error,
  } = useAlchemyAuth();

  const navigate = useNavigate();
  const location = useLocation();

  // Mapeamos AlchemyAuthUser → AuthContextUser (forma simplificada)
  const user: AuthContextUser | null = alchemyUser
    ? {
        id: alchemyUser.id,
        name: alchemyUser.name,
        email: alchemyUser.email,
        role: alchemyUser.role,
        avatarUrl: alchemyUser.avatarUrl,
      }
    : null;

  const isAuthenticated = !!user;

  // ── Redirigir a /login si la ruta es protegida y no hay sesión ──
  useEffect(() => {
    if (isLoading) return; // esperar a que Supabase resuelva la sesión

    const isPublic = PUBLIC_PATHS.some(p => location.pathname.startsWith(p));

    if (!isAuthenticated && !isPublic) {
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate]);

  const login = async () => {
    await signInWithGoogle();
  };

  const logout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        walletAddress,
        alchemyUser,
        login,
        logout,
        isAuthenticated,
        isLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook de acceso ──────────────────────────────────────────
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return context;
};
