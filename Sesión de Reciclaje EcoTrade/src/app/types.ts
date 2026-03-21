// Tipos de datos para EcoTrade

export type MaterialType = 
  | 'Plástico' 
  | 'Vidrio' 
  | 'Papel y cartón' 
  | 'Metal' 
  | 'Electrónicos (RAEE)';

export type SessionStatus = 
  | 'Borrador' 
  | 'Programada' 
  | 'En curso'
  | 'Pendiente de verificación'
  | 'Completada' 
  | 'Cancelada';

export type UserRole = 'Usuario' | 'Operador';

export type TrustLevel = 'Alta' | 'Media' | 'Baja';

export interface TrustSignal {
  id: string;
  label: string;
  passed: boolean;
  critical?: boolean;
}

export interface TrustScore {
  score: number; // 0-100
  level: TrustLevel;
  signals: TrustSignal[];
  requiresReview: boolean;
}

export interface SolanaReceipt {
  signature: string;
  cluster: 'devnet' | 'mainnet-beta';
  explorerUrl: string;
  emittedAt: Date;
  programId?: string;
}

export interface Material {
  type: MaterialType;
  kg: number;
  observation?: string;
  verified?: boolean;
  verifiedKg?: number; // KG verificados por operador
}

export interface CollectionPoint {
  id: string;
  name: string;
  address: string;
  schedule: string;
  distance?: string;
  acceptedMaterials: MaterialType[];
  instructions?: string;
  limits?: string;
}

export interface CarbonOffset {
  id?: string;
  co2_avoided_kg: number;
  trees_equivalent: number;
  kg_by_material?: Record<string, number>;
  calculated_at?: Date;
}

export interface SessionTimeline {
  status: SessionStatus;
  timestamp: Date;
  actor?: string;
  note?: string;
}

export interface RecyclingSession {
  id: string;
  sessionNumber: string;
  status: SessionStatus;
  point: CollectionPoint;
  scheduledDate?: string;
  scheduledTime?: string;
  materials: Material[];
  evidence?: string[];
  evidenceHash?: string; // SHA-256 or IPFS CID
  totalKg: number;
  verifiedTotalKg?: number; // Total verificado por operador
  ecoCoins: number;
  estimatedEcoCoins?: number;
  trustScore?: TrustScore;
  solanaReceipt?: SolanaReceipt;
  timeline: SessionTimeline[];
  cancellationReason?: string;
  operatorNote?: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  operatorId?: string;
  verifiedBy?: string;
  qrCode?: string;
  carbonOffset?: CarbonOffset;
}