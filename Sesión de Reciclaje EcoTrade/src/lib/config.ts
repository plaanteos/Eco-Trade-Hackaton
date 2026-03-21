/**
 * Configuración central de EcoTrade
 */

import { SessionStatus } from '@/app/types';

export const CONFIG = {
  // Configuración de Materiales Válidos
  MATERIALS: [
    'Plástico (PET/PEAD)', 
    'Vidrio', 
    'Papel y Cartón', 
    'Metal (Aluminio/Hojalata)', 
    'Electrónicos (RAEE)',
    'Otros'
  ],

  // Tasa de conversión de Kg a EcoCoins
  ECO_COINS_RATE: 10, // 1 EcoCoin por cada 10 KG verificados

  // Umbrales para el Trust Score
  TRUST_SCORE_THRESHOLDS: {
    ALTA: 80,
    MEDIA: 50
  },

  // Solana y Blockchain
  SOLANA_MEMO_PROGRAM: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  SOLANA_NETWORK: import.meta.env.VITE_SOLANA_NETWORK || 'devnet',
  SOLANA_RPC_URL: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',

  // Límites para la subida de evidencia (Fotos/Videos)
  MAX_EVIDENCE_FILES: 5,
  MAX_EVIDENCE_SIZE_MB: 10,

  // Estados válidos de Sesiones
  SESSION_STATUSES: [
    { value: 'Borrador' as SessionStatus, label: 'Borrador', color: 'bg-gray-100 text-gray-800' },
    { value: 'Programada' as SessionStatus, label: 'Programada', color: 'bg-blue-100 text-blue-800' },
    { value: 'En curso' as SessionStatus, label: 'En Curso', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'Pendiente de verificación' as SessionStatus, label: 'Pendiente', color: 'bg-orange-100 text-orange-800' },
    { value: 'Completada' as SessionStatus, label: 'Completada', color: 'bg-green-100 text-green-800' },
    { value: 'Cancelada' as SessionStatus, label: 'Cancelada', color: 'bg-red-100 text-red-800' }
  ]
} as const;
