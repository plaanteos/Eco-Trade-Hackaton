import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase/client';
import type { SolanaReceipt } from '@/app/types';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const SOLANA_RPC_URL = 'https://api.devnet.solana.com';

// Connection instance
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Funciones legacy de generacion de keypair local movidas a api/emit-solana.ts

/**
 * Emite un recibo Solana guardando la información de la sesión on-chain
 * a través del SPL Memo Program.
 */
export async function emitirReciboSolana(sessionId: string): Promise<SolanaReceipt> {
  const res = await fetch('/api/emit-solana', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore json parse errors
  }

  if (!res.ok || !data?.success) {
    const message = data?.error || `Error del servidor en API Solana (${res.status})`;
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
    const parsedTx = await connection.getParsedTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!parsedTx) {
      return { valid: false, data: null };
    }

    // Extraer el memo del log de instrucciones
    let memoData = null;
    const instructions = parsedTx.transaction.message.instructions;
    for (const ix of instructions) {
      if ('programId' in ix && ix.programId.equals(MEMO_PROGRAM_ID)) {
         memoData = 'parsed' in ix ? ix.parsed : ix.data;
      }
    }

    return { 
      valid: true, 
      data: memoData 
    };
  } catch (err) {
    console.error('[Solana] Error verificando recibo:', err);
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
    cluster: data.cluster as 'devnet' | 'mainnet-beta',
    explorerUrl: data.explorer_url,
    emittedAt: new Date(data.emitted_at),
    programId: data.program_id ?? undefined
  };
}

/**
 * Busca recibos con status 'pending' que ya expiró el retry_at y los reintenta.
 */
export async function retryPendingRecibos(): Promise<void> {
  const { data: pendingReceipts, error } = await supabase
    .from('solana_receipts')
    .select('session_id')
    .eq('status', 'pending')
    .lte('retry_at', new Date().toISOString());

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
