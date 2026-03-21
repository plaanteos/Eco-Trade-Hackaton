// ============================================================
//  EcoTrade — useSessions
//  src/hooks/useSessions.ts
//
//  Hook React que expone el sessions service con estado reactivo.
//  Gestiona loading, error y cache local de sesiones.
// ============================================================

import { useState, useCallback } from "react";
import {
  getUserSessions,
  getSessionById,
  createSession,
  updateSessionStatus,
  finalizarSesion,
  cancelSession,
  getPublicSession,
  getAllSessionsForOperator,
  getPendingSessionsForOperator,
  type CreateSessionInput,
  type PublicSessionData,
} from "@/lib/sessions";
import type { RecyclingSession, SessionStatus } from "@/app/types";

// ─── Estado del hook ─────────────────────────────────────────

interface UseSessionsState {
  sessions: RecyclingSession[];
  currentSession: RecyclingSession | null;
  isLoading: boolean;
  error: string | null;
}

// ─── Hook ────────────────────────────────────────────────────

export function useSessions() {
  const [state, setState] = useState<UseSessionsState>({
    sessions: [],
    currentSession: null,
    isLoading: false,
    error: null,
  });

  const setLoading = (isLoading: boolean) =>
    setState((prev) => ({ ...prev, isLoading, error: null }));

  const setError = (error: string) =>
    setState((prev) => ({ ...prev, isLoading: false, error }));

  // ── Cargar sesiones del usuario ───────────────────────────
  const loadUserSessions = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const sessions = await getUserSessions(userId);
      setState((prev) => ({ ...prev, sessions, isLoading: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar sesiones");
    }
  }, []);

  // ── Cargar sesión individual ──────────────────────────────
  const loadSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const session = await getSessionById(sessionId);
      setState((prev) => ({ ...prev, currentSession: session, isLoading: false }));
      return session;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar sesión");
      return null;
    }
  }, []);

  // ── Crear sesión ──────────────────────────────────────────
  const create = useCallback(async (data: CreateSessionInput): Promise<RecyclingSession | null> => {
    setLoading(true);
    try {
      const session = await createSession(data);
      setState((prev) => ({
        ...prev,
        sessions: [session, ...prev.sessions],
        currentSession: session,
        isLoading: false,
      }));
      return session;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear sesión");
      return null;
    }
  }, []);

  // ── Actualizar estado ─────────────────────────────────────
  const updateStatus = useCallback(
    async (
      sessionId: string,
      newStatus: SessionStatus,
      actor: string,
      note?: string
    ) => {
      setLoading(true);
      try {
        await updateSessionStatus(sessionId, newStatus, actor, note);
        // Recargar para sincronizar
        const updated = await getSessionById(sessionId);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          currentSession: updated ?? prev.currentSession,
          sessions: prev.sessions.map((s) => (s.id === sessionId ? (updated ?? s) : s)),
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al actualizar estado");
      }
    },
    []
  );

  // ── Finalizar sesión ──────────────────────────────────────
  const finalize = useCallback(
    async (sessionId: string, verifiedKg: number, operatorId: string) => {
      setLoading(true);
      try {
        await finalizarSesion(sessionId, verifiedKg, operatorId);
        const updated = await getSessionById(sessionId);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          currentSession: updated ?? prev.currentSession,
          sessions: prev.sessions.map((s) => (s.id === sessionId ? (updated ?? s) : s)),
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al finalizar sesión");
      }
    },
    []
  );

  // ── Cancelar sesión ───────────────────────────────────────
  const cancel = useCallback(async (sessionId: string, reason: string) => {
    setLoading(true);
    try {
      await cancelSession(sessionId, reason);
      const updated = await getSessionById(sessionId);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        currentSession: updated ?? prev.currentSession,
        sessions: prev.sessions.map((s) => (s.id === sessionId ? (updated ?? s) : s)),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cancelar sesión");
    }
  }, []);

  // ── Verificación pública ──────────────────────────────────
  const getPublic = useCallback(
    async (sessionId: string): Promise<PublicSessionData | null> => {
      try {
        return await getPublicSession(sessionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar verificación pública");
        return null;
      }
    },
    []
  );

  // ── Cola del operador ─────────────────────────────────────
  const loadOperatorQueue = useCallback(async () => {
    setLoading(true);
    try {
      const sessions = await getPendingSessionsForOperator();
      setState((prev) => ({ ...prev, sessions, isLoading: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar cola de operador");
    }
  }, []);

  const loadAllSessions = useCallback(async () => {
    setLoading(true);
    try {
      const sessions = await getAllSessionsForOperator();
      setState((prev) => ({ ...prev, sessions, isLoading: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar sesiones");
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // Estado
    sessions: state.sessions,
    currentSession: state.currentSession,
    isLoading: state.isLoading,
    error: state.error,
    // Acciones
    loadUserSessions,
    loadSession,
    create,
    updateStatus,
    finalize,
    cancel,
    getPublic,
    loadOperatorQueue,
    loadAllSessions,
    clearError,
  };
}
