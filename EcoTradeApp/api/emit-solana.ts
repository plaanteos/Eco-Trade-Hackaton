// api/emit-solana.ts
// ============================================================
//  EcoTrade — Vercel Serverless Function
//  Emite un recibo Solana real en devnet usando el wallet
//  del operador EcoTrade (SOLANA_OPERATOR_SEED como env var).
//
//  POST /api/emit-solana
//  Body: { sessionId: string }
//  Returns: { signature, explorerUrl, cluster }
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
} from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';

// ── Constantes ────────────────────────────────────────────────
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
type SolanaCluster = 'devnet' | 'mainnet-beta';
const CLUSTER: SolanaCluster =
  (getFirstEnv('SOLANA_NETWORK', 'VITE_SOLANA_NETWORK') as SolanaCluster | undefined) || 'devnet';

function getFirstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim().length > 0) return value;
  }
  return undefined;
}

// Usa el RPC de Alchemy si está disponible, o el público de devnet
const ALCHEMY_KEY = getFirstEnv('ALCHEMY_APIKEY');
const RPC_URL =
  getFirstEnv('SOLANA_RPC_URL', 'VITE_SOLANA_RPC_URL') ||
  (ALCHEMY_KEY
    ? CLUSTER === 'mainnet-beta'
      ? `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
      : `https://solana-devnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : CLUSTER === 'mainnet-beta'
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com');

function guessRpcCluster(rpcUrl: string): SolanaCluster | null {
  const u = rpcUrl.toLowerCase();
  if (u.includes('mainnet')) return 'mainnet-beta';
  if (u.includes('devnet')) return 'devnet';
  return null;
}

// ── Helper: base58 (sin dependencia extra) ───────────────────
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function decodeBase58(str: string): Uint8Array {
  const bytes = [0];
  for (const char of str) {
    let carry = BASE58_ALPHABET.indexOf(char);
    if (carry < 0) throw new Error(`Invalid base58 char: ${char}`);
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const char of str) {
    if (char === '1') bytes.push(0);
    else break;
  }
  return Uint8Array.from(bytes.reverse());
}

// ── Obtener el wallet del operador ────────────────────────────
function getOperatorKeypair(): Keypair {
  const seed = process.env.SOLANA_OPERATOR_SEED;
  if (!seed) {
    throw new Error('SOLANA_OPERATOR_SEED environment variable not set');
  }

  // Si la env var es la secret key completa (64 bytes en base58 ~88 chars)
  if (seed.length > 60) {
    try {
      const secretKey = decodeBase58(seed);
      if (secretKey.length === 64) {
        return Keypair.fromSecretKey(secretKey);
      }
    } catch {}
  }

  // Si es una seed de 32 bytes (base58 ~43-44 chars), usarla directamente
  const seedBytes = decodeBase58(seed);
  return Keypair.fromSeed(seedBytes.slice(0, 32));
}

// ── Asegurar fondos (airdrop si balance bajo) ─────────────────
async function ensureFunds(connection: Connection, pubkey: PublicKey): Promise<void> {
  const balance = await connection.getBalance(pubkey, 'confirmed');
  console.log(`[Solana API] Balance de ${pubkey.toBase58()}: ${balance} lamports`);

  if (balance >= 5_000_000) return; // 0.005 SOL es suficiente

  console.log('[Solana API] Solicitando airdrop...');
  try {
    const sig = await connection.requestAirdrop(pubkey, 1_000_000_000);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('[Solana API] Airdrop confirmado');
  } catch (err) {
    console.warn('[Solana API] Airdrop falló, intentando continuar:', err);
  }
}

// ── Handler principal ─────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  const supabaseUrl = getFirstEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const serviceRoleKey = getFirstEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY');

  if (!supabaseUrl) {
    return res.status(500).json({
      error:
        'Missing Supabase URL env var. Set SUPABASE_URL (recommended) or VITE_SUPABASE_URL in Vercel Environment Variables (Production).',
    });
  }

  if (!serviceRoleKey) {
    return res.status(500).json({
      error:
        'Missing Supabase Service Role env var. Set SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables (Production).',
    });
  }

  // Cliente Supabase con service role para bypassar RLS
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const rpcClusterGuess = guessRpcCluster(RPC_URL);
    if (rpcClusterGuess && rpcClusterGuess !== CLUSTER) {
      return res.status(500).json({
        error:
          `Configuración Solana inconsistente: SOLANA_NETWORK=${CLUSTER} pero el RPC parece ser ${rpcClusterGuess} (${new URL(RPC_URL).host}). ` +
          `Ajusta SOLANA_RPC_URL/VITE_SOLANA_RPC_URL para ${CLUSTER} o cambia SOLANA_NETWORK.`,
      });
    }

    // 1. Cargar datos de la sesión
    const { data: session, error: fetchError } = await supabase
      .from('recycling_sessions')
      .select(`
        id, session_number, verified_total_kg, eco_coins,
        evidence_hash, operator_id, verified_by,
        collection_points(name),
        carbon_footprint_offsets(co2_avoided_kg, trees_equivalent)
      `)
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return res.status(404).json({ error: `Sesión no encontrada: ${fetchError?.message}` });
    }

    // 2. Construir memo payload
    const cf = Array.isArray(session.carbon_footprint_offsets)
      ? session.carbon_footprint_offsets[0]
      : session.carbon_footprint_offsets;

    const emittedAt = new Date().toISOString();
    const kgVerified = Number(session.verified_total_kg ?? 0);
    const co2Kg = cf ? Number(cf.co2_avoided_kg) : 0;
    const operatorId = session.verified_by || session.operator_id || 'ecotrade-op';

    const memoPayload = JSON.stringify({
      app: 'EcoTrade',
      v: 1,
      sid: session.id,
      sn: session.session_number,
      kg: kgVerified,
      co2: co2Kg,
      evh: session.evidence_hash || '',
      op: operatorId,
      t: emittedAt,
    });

    console.log(`[Solana API] Memo (${memoPayload.length} bytes):`, memoPayload);

    // 3. Conectar y obtener keypair
    const connection = new Connection(RPC_URL, 'confirmed');
    const keypair = getOperatorKeypair();
    console.log('[Solana API] Wallet:', keypair.publicKey.toBase58());
    console.log('[Solana API] Cluster:', CLUSTER);
    try {
      console.log('[Solana API] RPC host:', new URL(RPC_URL).host);
    } catch {
      console.log('[Solana API] RPC:', RPC_URL);
    }

    // 4. Obtener fondos si es necesario
    if (CLUSTER === 'devnet') {
      await ensureFunds(connection, keypair.publicKey);
    }

    // 5. Construir transacción
    const instruction = new TransactionInstruction({
      keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoPayload, 'utf-8'),
    });

    const tx = new Transaction().add(instruction);
    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = keypair.publicKey;
    tx.sign(keypair);

    // 6. Enviar y confirmar
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log('[Solana API] Tx enviada:', signature);

    const confirmation = await connection.confirmTransaction(
      { signature, blockhash: latestBlockhash.blockhash, lastValidBlockHeight: latestBlockhash.lastValidBlockHeight },
      'confirmed'
    );

    if (confirmation.value.err) {
      throw new Error(`Tx falló en confirmación: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log('[Solana API] Tx confirmada:', signature);

    // 7. Guardar en DB
    const explorerUrl =
      CLUSTER === 'devnet'
        ? `https://explorer.solana.com/tx/${signature}?cluster=devnet`
        : `https://explorer.solana.com/tx/${signature}`;
    const programId = MEMO_PROGRAM_ID.toBase58();

    const { error: rpcError } = await supabase.rpc('insert_solana_receipt', {
      p_session_id: sessionId,
      p_signature: signature,
      p_cluster: CLUSTER,
      p_explorer_url: explorerUrl,
      p_program_id: programId,
    });

    if (rpcError) {
      console.warn('[Solana API] RPC insert warning, usando upsert directo:', rpcError.message);
      await supabase.from('solana_receipts').upsert(
        {
          session_id: sessionId,
          signature,
          cluster: CLUSTER,
          explorer_url: explorerUrl,
          program_id: programId,
          emitted_at: emittedAt,
          status: 'confirmed',
        },
        { onConflict: 'session_id' }
      );
    }

    return res.status(200).json({
      success: true,
      signature,
      explorerUrl,
      cluster: CLUSTER,
      wallet: keypair.publicKey.toBase58(),
    });
  } catch (error: any) {
    console.error('[Solana API] Error:', error);
    return res.status(500).json({
      error: error.message || 'Error interno al emitir recibo Solana',
    });
  }
}
