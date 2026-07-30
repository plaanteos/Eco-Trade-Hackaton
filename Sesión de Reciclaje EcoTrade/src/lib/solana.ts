import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase/client';
import type { SolanaReceipt } from '@/app/types';
import { CONFIG } from '@/lib/config';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export function isLegacyHashReceiptSignature(signature: string): boolean {
  return /^[0-9a-f]{64}$/i.test(signature);
}

async function resolveTransactionVerification(
  connection: Connection,
  signature: string
): Promise<{ valid: boolean; data: unknown }> {
  const parsedTx = await connection.getParsedTransaction(signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  if (parsedTx) {
    let memoData: unknown = null;
    const instructions = parsedTx.transaction.message.instructions;
    for (const ix of instructions) {
      if ('programId' in ix && ix.programId.equals(MEMO_PROGRAM_ID)) {
        memoData = 'parsed' in ix ? ix.parsed : ix.data;
      }
    }

    return { valid: true, data: memoData };
  }

  const statuses = await connection.getSignatureStatuses([signature], {
    searchTransactionHistory: true,
  });

  const status = statuses.value[0];
  if (!status || status.err) {
    return { valid: false, data: null };
  }

  const isConfirmed = status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized';
  return { valid: isConfirmed, data: { confirmationStatus: status.confirmationStatus } };
}

function getRpcUrlsForCluster(cluster: SolanaReceipt['cluster']): string[] {
  const urls: string[] = [];

  if (CONFIG.SOLANA_NETWORK === cluster && CONFIG.SOLANA_RPC_URL) {
    urls.push(CONFIG.SOLANA_RPC_URL);
  }

  switch (cluster) {
    case 'devnet':
      urls.push('https://api.devnet.solana.com');
      break;
    case 'testnet':
      urls.push('https://api.testnet.solana.com');
      break;
    case 'mainnet-beta':
      urls.push('https://api.mainnet-beta.solana.com');
      urls.push('https://solana.public-rpc.com');
      break;
    default:
      urls.push('https://api.mainnet-beta.solana.com');
  }

  return [...new Set(urls)];
}

async function verifyAgainstRpcUrls(
  signature: string,
  cluster: SolanaReceipt['cluster']
): Promise<{ valid: boolean; data: any }> {
  const rpcUrls = getRpcUrlsForCluster(cluster);
  let lastError: unknown = null;

  for (const rpcUrl of rpcUrls) {
    try {
      const connection = new Connection(rpcUrl, 'confirmed');
      const result = await resolveTransactionVerification(connection, signature);
      if (result.valid) {
        return {
          valid: true,
          data: {
            ...(typeof result.data === 'object' && result.data !== null ? result.data : { result: result.data }),
            rpcUrl,
          },
        };
      }
    } catch (error) {
      lastError = error;
      console.warn(`[Solana] RPC ${rpcUrl} no pudo verificar la firma ${signature}:`, error);
    }
  }

  return {
    valid: false,
    data: {
      rpcUrls,
      error: lastError instanceof Error ? lastError.message : (lastError ?? null),
    },
  };
}

// Funciones legacy de generacion de keypair local movidas a api/emit-solana.ts

/**
 * Emite un recibo Solana guardando la información de la sesión on-chain
 * a través del SPL Memo Program.
 */
export async function emitirReciboSolana(sessionId: string): Promise<SolanaReceipt> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Debes iniciar sesión como operador para emitir recibos');
  }

  const res = await fetch('/api/emit-solana', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ sessionId }),
  });

  const rawBody = await res.text();

  let data: any = null;
  try {
    data = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // ignore json parse errors
  }

  if (!res.ok || !data?.success) {
    const message = data?.error || rawBody || `Error del servidor en API Solana (${res.status})`;
    console.error('[Solana] Error llamando a API emit-solana:', message);
    throw new Error(message);
  }

  const receipt: SolanaReceipt = {
    signature: data.signature,
    cluster: data.cluster,
    explorerUrl: data.explorerUrl,
    emittedAt: new Date(),
    programId: MEMO_PROGRAM_ID.toBase58(),
  };

  return receipt;
}

/**
 * Llama a Solana Explorer API/RPC para verificar que la tx existe y es válida.
 */
export async function verificarReciboPublico(signature: string): Promise<{valid: boolean, data: any}> {
  try {
    // Por defecto intentamos en la red configurada. Si la verificación pública
    // necesita otra red (según el recibo), el caller debe pasar el cluster.
    const cluster = (CONFIG.SOLANA_NETWORK as SolanaReceipt['cluster']) || 'devnet';
    return await verifyAgainstRpcUrls(signature, cluster);
  } catch (err) {
    console.error('[Solana] Error verificando recibo:', err);
    return { valid: false, data: null };
  }
}

/**
 * Verifica una firma contra un cluster específico (devnet/testnet/mainnet-beta).
 */
export async function verificarReciboPublicoEnCluster(
  signature: string,
  cluster: SolanaReceipt['cluster']
): Promise<{ valid: boolean; data: any }> {
  try {
    return await verifyAgainstRpcUrls(signature, cluster);
  } catch (err) {
    console.error('[Solana] Error verificando recibo (cluster):', err);
    return { valid: false, data: null };
  }
}

/**
 * Retorna el recibo solana asociado a una sesión.
 */
export async function getReciboBySession(sessionId: string): Promise<SolanaReceipt | null> {
  const { data, error } = await supabase
    .from('solana_receipts')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // Mapear al tipo frontend
  return {
    signature: data.signature,
    cluster: data.cluster as 'devnet' | 'testnet' | 'mainnet-beta',
    explorerUrl: data.explorer_url,
    emittedAt: new Date(data.emitted_at),
    programId: data.program_id ?? undefined
  };
}

/**
 * Busca recibos con status 'pending' y los reintenta.
 */
export async function retryPendingRecibos(): Promise<void> {
  const { data: pendingReceipts, error } = await supabase
    .from('solana_receipts')
    .select('session_id')
    .eq('status', 'pending');

  if (error || !pendingReceipts || pendingReceipts.length === 0) {
    return;
  }

  for (const receipt of pendingReceipts) {
    try {
      console.log(`[Solana] Reintentando emisión para sesión: ${receipt.session_id}`);
      await emitirReciboSolana(receipt.session_id);
    } catch (err) {
      console.warn(`[Solana] Falló reintento para ${receipt.session_id}`);
    }
  }
}
