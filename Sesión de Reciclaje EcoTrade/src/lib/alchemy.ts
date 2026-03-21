/// <reference types="vite/client" />
// ============================================================
//  EcoTrade — Alchemy Account Abstraction Config
//  src/lib/alchemy.ts
//
//  Integra Alchemy Account Kit con Supabase Auth.
//  La autenticación social (Google OAuth) se delega a Supabase;
//  la wallet Solana se deriva determinísticamente del UID del usuario.
// ============================================================

// ─── Tipos públicos ──────────────────────────────────────────
export interface AlchemyConfig {
  /** API Key de Alchemy (VITE_ALCHEMY_API_KEY) */
  apiKey: string;
  /** Cluster de Solana: devnet por defecto */
  network: 'solana-devnet' | 'solana-mainnet';
  /** URI de redirección OAuth */
  redirectUri: string;
}

export interface AlchemyClientLike {
  config: AlchemyConfig;
  /** Nombre del proveedor de login social activo */
  oauthProvider: 'google';
}

// ─── Leer config desde variables de entorno ─────────────────
const apiKey: string =
  (import.meta.env.VITE_ALCHEMY_API_KEY as string | undefined) ?? '';

export const alchemyConfig: AlchemyConfig = {
  apiKey,
  network: 'solana-devnet',
  redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
};

// ─── Singleton ───────────────────────────────────────────────
let _client: AlchemyClientLike | null = null;

/**
 * Devuelve el cliente Alchemy (singleton).
 * En producción conectaría con @account-kit/react;
 * aquí expone la misma interfaz y delega auth a Supabase OAuth.
 */
export function getAlchemyClient(): AlchemyClientLike {
  if (!_client) {
    _client = {
      config: alchemyConfig,
      oauthProvider: 'google',
    };
  }
  return _client;
}

// ─── Utilidades de wallet Solana ─────────────────────────────

/**
 * Deriva una dirección Solana (base58) de forma determinística
 * a partir del UUID del usuario.
 *
 * En un entorno de producción con Alchemy Account Kit esto se
 * haría llamando a `getAddress()` sobre el SmartAccountClient
 * después del login. Aquí emulamos ese comportamiento de manera
 * que la misma cuenta siempre produzca la misma wallet.
 */
export async function deriveWalletAddress(userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`ecotrade:solana:${userId}`);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);

  return base58Encode(hashArray.slice(0, 32)); // 32 bytes → dirección Solana
}

// ─── Base58 encoder (subset para Solana) ─────────────────────
const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(bytes: Uint8Array): string {
  let num = BigInt('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
  let result = '';

  while (num > 0n) {
    const remainder = num % 58n;
    num = num / 58n;
    result = BASE58_ALPHABET[Number(remainder)] + result;
  }

  // Añadir '1' por cada byte cero al principio (convención Bitcoin/Solana)
  for (const byte of bytes) {
    if (byte !== 0) break;
    result = '1' + result;
  }

  return result;
}
