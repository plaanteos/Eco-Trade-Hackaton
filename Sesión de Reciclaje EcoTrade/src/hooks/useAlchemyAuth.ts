// ============================================================
//  EcoTrade — useAlchemyAuth
//  src/hooks/useAlchemyAuth.ts
//
//  Hook que implementa el flujo completo:
//    1. Google OAuth via Supabase (equivalente al flujo Alchemy AA)
//    2. Derivación determinística de walletAddress Solana
//    3. Upsert en tabla `profiles` (sin sobreescribir role existente)
//    4. Sign-out coordinado Supabase
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { deriveWalletAddress, getAlchemyClient } from '@/lib/alchemy';
import type { UserRole } from '@/app/types';

// ─── Tipos ───────────────────────────────────────────────────

export interface AlchemyAuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  walletAddress: string;
}

export interface UseAlchemyAuthReturn {
  /** Usuario autenticado o null */
  user: AlchemyAuthUser | null;
  /** Dirección Solana derivada para el usuario */
  walletAddress: string | null;
  /** Inicia el flujo Google OAuth */
  signInWithGoogle: () => Promise<void>;
  /** Cierra sesión en Supabase */
  signOut: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// ─── Hook ────────────────────────────────────────────────────

export function useAlchemyAuth(): UseAlchemyAuthReturn {
  const [user, setUser] = useState<AlchemyAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ── Sincronizar sesión Supabase → perfil EcoTrade ─────────
  const syncSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session?.user) {
        setUser(null);
        return;
      }

      const supabaseUser = session.user;

      // Derivar wallet Solana determinísticamente
      const walletAddress = await deriveWalletAddress(supabaseUser.id);

      // Leer perfil existente para preservar el role
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      const role: UserRole = (existingProfile?.role as UserRole) ?? 'Usuario';

      // Upsert: sólo escribe role si NO existía previamente
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: supabaseUser.id,
            email: supabaseUser.email ?? '',
            wallet_address: walletAddress,
            // Sólo establece role si el perfil es nuevo
            ...(existingProfile ? {} : { role }),
          },
          { onConflict: 'id' }
        );

      if (upsertError) {
        // No detener el flujo si el upsert falla (RLS, tabla no existe todavía, etc.)
        console.warn('[EcoTrade] profiles upsert warning:', upsertError.message);
      }

      const authUser: AlchemyAuthUser = {
        id: supabaseUser.id,
        email: supabaseUser.email ?? '',
        name:
          supabaseUser.user_metadata?.full_name ??
          supabaseUser.user_metadata?.name ??
          supabaseUser.email?.split('@')[0] ??
          'Usuario',
        avatarUrl: supabaseUser.user_metadata?.avatar_url ?? undefined,
        role,
        walletAddress,
      };

      setUser(authUser);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de autenticación';
      setError(message);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Inicializar: recuperar sesión existente ────────────────
  useEffect(() => {
    void syncSession();

    // Escuchar cambios de sesión (login OAuth callback, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          await syncSession();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [syncSession]);

  // ── Google OAuth ──────────────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Registrar uso del cliente Alchemy (config disponible para futura integración)
      getAlchemyClient();

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) throw oauthError;
      // El flujo continúa en el callback URL → onAuthStateChange lo maneja
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión con Google';
      setError(message);
      setIsLoading(false);
    }
  }, []);

  // ── Sign out ──────────────────────────────────────────────
  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cerrar sesión';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    walletAddress: user?.walletAddress ?? null,
    signInWithGoogle,
    signOut,
    isLoading,
    error,
  };
}
