import { Connection, Keypair, Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase/client';
import type { SolanaReceipt } from '@/app/types';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const SOLANA_CLUSTER = 'devnet';
const SOLANA_RPC_URL = 'https://api.devnet.solana.com';

// Connection instance
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

/**
 * Deriva de forma determinística un Keypair desde el operatorId
 * (Simulación de Alchemy Account Abstraction localmente).
 */
async function getOperatorKeypair(operatorId: string): Promise<Keypair> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`ecotrade:solana:${operatorId}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Keypair.fromSeed(hashArray.slice(0, 32));
}

/**
 * Emite un recibo Solana guardando la información de la sesión on-chain
 * a través del SPL Memo Program.
 */
export async function emitirReciboSolana(sessionId: string): Promise<SolanaReceipt> {
  // 1. Cargar sesión completa desde Supabase
  const { data: session, error: fetchError } = await supabase
    .from('recycling_sessions')
    .select(`
      id,
      session_number,
      scheduled_date,
      verified_total_kg,
      eco_coins,
      evidence_hash,
      operator_id,
      verified_by,
      collection_points(name),
      carbon_footprint_offsets(
        co2_avoided_kg,
        trees_equivalent
      )
    `)
    .eq('id', sessionId)
    .single();

  if (fetchError || !session) {
    throw new Error(`[Solana] Fallo al cargar sesión: ${fetchError?.message}`);
  }

  const cp = Array.isArray(session.collection_points) 
    ? session.collection_points[0] 
    : session.collection_points;
  
  const cf = Array.isArray(session.carbon_footprint_offsets)
    ? session.carbon_footprint_offsets[0]
    : session.carbon_footprint_offsets;

  const puntoNombre = cp?.name || 'Desconocido';
  const operatorId = session.verified_by || session.operator_id;

  if (!operatorId) {
    throw new Error('[Solana] No se encontró el ID del operador que verificó.');
  }

  // 2. Construir el payload del memo (JSON compacto)
  const memoPayload = {
    app: "EcoTrade",
    v: "1",
    session: session.session_number,
    punto: puntoNombre,
    fecha: session.scheduled_date || new Date().toISOString().split('T')[0],
    totalKg: session.verified_total_kg || 0,
    ecoCoins: session.eco_coins || 0,
    evidenceHash: session.evidence_hash || "",
    co2Kg: cf ? Number(cf.co2_avoided_kg) : 0,
    trees: cf ? Number(cf.trees_equivalent) : 0,
    verifiedBy: operatorId
  };

  const memoString = JSON.stringify(memoPayload);
  
  // Limitar a máximo 566 bytes que pide el estándar (aunque a veces son 768)
  if (new Blob([memoString]).size > 566) {
    console.warn("[Solana] Payload excede 566 bytes. Podría fallar.");
  }

  try {
    // 3 y 4. Obtener wallet del operador (Keypair derivado)
    const operatorKeypair = await getOperatorKeypair(operatorId);

    // 5. Construir Transaction con instrucción al Memo Program
    const instruction = new TransactionInstruction({
      keys: [{ pubkey: operatorKeypair.publicKey, isSigner: true, isWritable: true }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoString, 'utf-8'),
    });

    const tx = new Transaction().add(instruction);
    
    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = operatorKeypair.publicKey;

    // Firmar transacción
    tx.sign(operatorKeypair);

    // 6. Enviar transacción y esperar confirmación
    const signature = await connection.sendRawTransaction(tx.serialize());
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Fallo en la firma o ejecución de tx: ${confirmation.value.err.toString()}`);
    }

    // 7. Construir SolanaReceipt
    const receipt: SolanaReceipt = {
      signature,
      cluster: SOLANA_CLUSTER,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_CLUSTER}`,
      emittedAt: new Date(),
      programId: MEMO_PROGRAM_ID.toBase58()
    };

    // 8. Hacer upsert en solana_receipts con status 'confirmed'
    const { error: upsertError } = await supabase
      .from('solana_receipts')
      .upsert({
        session_id: sessionId,
        signature: receipt.signature,
        cluster: receipt.cluster,
        explorer_url: receipt.explorerUrl,
        program_id: receipt.programId,
        emitted_at: receipt.emittedAt.toISOString(),
        status: 'confirmed'
      }, { onConflict: 'session_id' });

    if (upsertError) {
      console.warn('[Solana] Error guardando recibo confirmado en DB:', upsertError.message);
    }

    // 9. Actualizar session con solana_receipt_id if applicable schema handles it
    // Si la tabla recycling_sessions tiene columna solana_receipt_id, también se hace. 
    // Usualmente no es necesario por ser relación 1-to-1 por session_id.
    const { error: updateSessionError } = await supabase
      .from('recycling_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    
    if (updateSessionError) {
      console.warn('[Solana] Error actualizando sesión:', updateSessionError.message);
    }

    // 10. Retornar el SolanaReceipt
    return receipt;
  } catch (error: any) {
    console.error('[Solana] Error emitiendo recibo:', error);
    
    const isNetworkError = error?.message?.includes('fetch') || error?.message?.includes('Network') || error?.message?.includes('timeout') || error?.message?.includes('RPC');
    
    if (isNetworkError) {
      // Manejo si falla conexión a RPC: guardar pending con retry
      const retryAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await supabase.from('solana_receipts').upsert({
        session_id: sessionId,
        status: 'pending',
        retry_at: retryAt
      }, { onConflict: 'session_id' });
    } else {
      // Si falla firma u otra cosa: status 'failed'
      await supabase.from('solana_receipts').upsert({
        session_id: sessionId,
        status: 'failed',
        error_log: error?.message || 'Error desconocido'
      }, { onConflict: 'session_id' });
    }
    
    throw error;
  }
}

/**
 * Llama a Solana Explorer API/RPC para verificar que la tx existe y es válida.
 */
export async function verificarReciboPublico(signature: string): Promise<{valid: boolean, data: any}> {
  try {
    const parsedTx = await connection.getParsedTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0.
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
