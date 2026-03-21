import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CollectionPoint, Material, RecyclingSession } from '../types';
import { calculateEcoCoins, calculateTotalKg } from '../data/mock-data';

interface SessionDraft {
  point?: CollectionPoint;
  scheduledDate?: string;
  scheduledTime?: string;
  materials: Material[];
  evidence: string[];
}

interface SessionContextType {
  draft: SessionDraft;
  setPoint: (point: CollectionPoint) => void;
  setDateTime: (date: string, time: string) => void;
  setMaterials: (materials: Material[]) => void;
  addEvidence: (evidence: string) => void;
  clearDraft: () => void;
  getEstimatedEcoCoins: () => number;
  getTotalKg: () => number;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [draft, setDraft] = useState<SessionDraft>(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ecotrade-draft');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return { materials: [], evidence: [] };
        }
      }
    }
    return { materials: [], evidence: [] };
  });

  // Save to localStorage whenever draft changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ecotrade-draft', JSON.stringify(draft));
    }
  }, [draft]);

  const setPoint = (point: CollectionPoint) => {
    setDraft(prev => ({ ...prev, point }));
  };

  const setDateTime = (date: string, time: string) => {
    setDraft(prev => ({ ...prev, scheduledDate: date, scheduledTime: time }));
  };

  const setMaterials = (materials: Material[]) => {
    setDraft(prev => ({ ...prev, materials }));
  };

  const addEvidence = (evidence: string) => {
    setDraft(prev => ({ ...prev, evidence: [...prev.evidence, evidence] }));
  };

  const clearDraft = () => {
    const emptyDraft = { materials: [], evidence: [] };
    setDraft(emptyDraft);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ecotrade-draft');
    }
  };

  const getTotalKg = () => {
    return calculateTotalKg(draft.materials);
  };

  const getEstimatedEcoCoins = () => {
    return calculateEcoCoins(getTotalKg());
  };

  return (
    <SessionContext.Provider
      value={{
        draft,
        setPoint,
        setDateTime,
        setMaterials,
        addEvidence,
        clearDraft,
        getEstimatedEcoCoins,
        getTotalKg,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};