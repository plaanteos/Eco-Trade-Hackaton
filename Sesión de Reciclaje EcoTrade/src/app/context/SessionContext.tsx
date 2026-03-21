import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { CollectionPoint, Material, RecyclingSession } from '../types';
import { supabase } from '@/lib/supabase/client';
import { getUserSessions, getOperatorSessions } from '@/lib/sessions';

interface SessionDraft {
  point?: CollectionPoint;
  scheduledDate?: string;
  scheduledTime?: string;
  materials: Material[];
  evidence: File[];
}

interface SessionContextType {
  // Draft State (for creation)
  draft: SessionDraft;
  setPoint: (point: CollectionPoint) => void;
  setDateTime: (date: string, time: string) => void;
  setMaterials: (materials: Material[]) => void;
  addEvidence: (evidence: File[]) => void;
  clearDraft: () => void;
  getEstimatedEcoCoins: () => number;
  getTotalKg: () => number;
  
  // Real DB State
  sessions: RecyclingSession[];
  currentSession: RecyclingSession | null;
  setCurrentSession: (session: RecyclingSession | null) => void;
  isLoading: boolean;
  error: Error | null;
  refreshSessions: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- DRAFT STATE ---
  const [draft, setDraft] = useState<SessionDraft>(() => {
    // In real app avoid sending `File` to localStorage but for simplicity we keep empty array on reload
    return { materials: [], evidence: [] };
  });

  const setPoint = (point: CollectionPoint) => setDraft(prev => ({ ...prev, point }));
  const setDateTime = (date: string, time: string) => setDraft(prev => ({ ...prev, scheduledDate: date, scheduledTime: time }));
  const setMaterials = (materials: Material[]) => setDraft(prev => ({ ...prev, materials }));
  const addEvidence = (evidence: File[]) => setDraft(prev => ({ ...prev, evidence: [...prev.evidence, ...evidence] }));
  const clearDraft = () => setDraft({ materials: [], evidence: [] });

  const getTotalKg = () => draft.materials.reduce((sum, m) => sum + m.kg, 0);
  const getEstimatedEcoCoins = () => Math.floor(getTotalKg() / 10);

  // --- REAL DB STATE ---
  const [sessions, setSessions] = useState<RecyclingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<RecyclingSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch role from profile since we need it here
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const dataSessions = profile?.role === 'Operador'
          ? await getOperatorSessions(user.id)
          : await getUserSessions(user.id);
          
        setSessions(dataSessions);
      } else {
        setSessions([]);
      }
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(err.message || 'Error al cargar sesiones'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch unmounting
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  return (
    <SessionContext.Provider
      value={{
        draft, setPoint, setDateTime, setMaterials, addEvidence, clearDraft, getEstimatedEcoCoins, getTotalKg,
        sessions, currentSession, setCurrentSession, isLoading, error, refreshSessions
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
};