import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
} from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

type SolanaCluster = 'devnet' | 'testnet' | 'mainnet-beta';

interface SessionEvidenceRow {
  public_url: string | null;
  storage_path: string | null;
}

interface SessionReceiptRow {
  signature: string;
  cluster: SolanaCluster;
  explorer_url: string | null;
  program_id: string | null;
  status: 'pending' | 'confirmed' | 'failed';
}

interface SessionRow {
  id: string;
  session_number: string;
  status: string;
  verified_total_kg: number | null;
  eco_coins: number;
  evidence_hash: string | null;
  operator_id: string | null;
  verified_by: string | null;
  user_id: string;
  collection_points: { name: string } | { name: string }[] | null;
  carbon_footprint_offsets:
    | { co2_avoided_kg: number; trees_equivalent: number }
    | Array<{ co2_avoided_kg: number; trees_equivalent: number }>
    | null;
  session_evidence: SessionEvidenceRow[] | null;
  solana_receipts: SessionReceiptRow | SessionReceiptRow[] | null;
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getFirstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

const CLUSTER: SolanaCluster =
  (getFirstEnv('SOLANA_NETWORK', 'VITE_SOLANA_NETWORK') as SolanaCluster | undefined) || 'devnet';

const ALCHEMY_KEY = getFirstEnv('ALCHEMY_APIKEY', 'ALCHEMY_API_KEY');
const RPC_URL =
  getFirstEnv('SOLANA_RPC_URL', 'VITE_SOLANA_RPC_URL') ||
  (ALCHEMY_KEY
    ? CLUSTER === 'mainnet-beta'
      ? `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
      : CLUSTER === 'testnet'
        ? `https://solana-testnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
        : `https://solana-devnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
    : CLUSTER === 'mainnet-beta'
      ? 'https://api.mainnet-beta.solana.com'
      : CLUSTER === 'testnet'
        ? 'https://api.testnet.solana.com'
        : 'https://api.devnet.solana.com');

function guessRpcCluster(rpcUrl: string): SolanaCluster | null {
  const normalized = rpcUrl.toLowerCase();
  if (normalized.includes('mainnet')) return 'mainnet-beta';
  if (normalized.includes('testnet')) return 'testnet';
  if (normalized.includes('devnet')) return 'devnet';
  return null;
}

function decodeBase58(str: string): Uint8Array {
  const bytes = [0];
  for (const char of str) {
    if (/\s/.test(char)) continue;
    let carry = BASE58_ALPHABET.indexOf(char);
    if (carry < 0) throw new Error(`Invalid base58 char: ${char}`);
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
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

function getOperatorKeypair(): Keypair {
  const seed = getFirstEnv('SOLANA_OPERATOR_SEED');
  if (!seed) throw new Error('SOLANA_OPERATOR_SEED environment variable not set');

  const trimmed = seed.trim();

  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed);
      if (
        Array.isArray(arr) &&
        arr.length === 64 &&
        arr.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)
      ) {
        return Keypair.fromSecretKey(Uint8Array.from(arr));
      }
    } catch {
      // ignore malformed JSON and keep trying supported formats
    }
  }

  if (trimmed.length > 60) {
    try {
      const secretKey = decodeBase58(trimmed);
      if (secretKey.length === 64) {
        return Keypair.fromSecretKey(secretKey);
      }
    } catch {
      // ignore and try the seed path below
    }
  }

  const seedBytes = decodeBase58(trimmed);
  return Keypair.fromSeed(seedBytes.slice(0, 32));
}

function isLegacyHashReceiptSignature(signature: string): boolean {
  return /^[0-9a-f]{64}$/i.test(signature);
}

function getBearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

function normalizeJoinedRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getReceiptExplorerUrl(signature: string, cluster: SolanaCluster): string {
  if (cluster === 'mainnet-beta') return `https://explorer.solana.com/tx/${signature}`;
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function assertTransactionVisible(connection: Connection, signature: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const statuses = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    });
    const status = statuses.value[0];

    if (
      status &&
      !status.err &&
      (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized')
    ) {
      return;
    }

    await sleep(400 * (attempt + 1));
  }

  throw new Error('La transacción fue enviada pero no quedó visible en el historial RPC para verificación pública');
}

async function ensureFunds(
  connection: Connection,
  pubkey: PublicKey,
  cluster: SolanaCluster
): Promise<void> {
  const minLamports = Number(getFirstEnv('SOLANA_MIN_BALANCE_LAMPORTS') ?? 5000000);
  const balance = await connection.getBalance(pubkey, 'confirmed');

  if (balance >= minLamports) return;

  if (cluster !== 'devnet' && cluster !== 'testnet') {
    throw new Error(
      `Wallet sin saldo para fees en ${cluster}. Fondea ${pubkey.toBase58()} y reintenta.`
    );
  }

  const runningOnVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (runningOnVercel) {
    throw new Error(
      `Wallet sin saldo en ${cluster} (balance=${balance}). ` +
        `Fondea manualmente ${pubkey.toBase58()} en ${cluster} y reintenta.`
    );
  }

  const airdropLamports = Number(getFirstEnv('SOLANA_AIRDROP_LAMPORTS') ?? 200000000);
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const signature = await connection.requestAirdrop(pubkey, airdropLamports);
      await connection.confirmTransaction(signature, 'confirmed');
      const updatedBalance = await connection.getBalance(pubkey, 'confirmed');
      if (updatedBalance >= minLamports) return;
    } catch (error) {
      lastError = error;
      await sleep(700 * attempt);
    }
  }

  throw new Error(
    `No se pudo fondear la wallet en ${cluster}. Último error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

async function requireOperator(
  supabase: ReturnType<typeof createClient>,
  req: VercelRequest
): Promise<{ id: string; displayName: string }> {
  const token = getBearerToken(req);
  if (!token) throw new HttpError(401, 'Falta token de autenticación');

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    throw new HttpError(401, 'Sesión inválida o expirada');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new HttpError(500, `No se pudo validar el rol del operador: ${profileError.message}`);
  }

  if (profile?.role !== 'Operador') {
    throw new HttpError(403, 'Solo un operador autenticado puede emitir recibos');
  }

  return {
    id: user.id,
    displayName: profile.email ?? user.email ?? user.id,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    return res.status(500).json({ error: 'Missing Supabase URL env var' });
  }

  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'Missing Supabase Service Role env var' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const operator = await requireOperator(supabase, req);

    const rpcClusterGuess = guessRpcCluster(RPC_URL);
    if (rpcClusterGuess && rpcClusterGuess !== CLUSTER) {
      throw new HttpError(
        500,
        `Configuración Solana inconsistente: SOLANA_NETWORK=${CLUSTER} pero el RPC parece ser ${rpcClusterGuess}`
      );
    }

    const { data, error } = await supabase
      .from('recycling_sessions')
      .select(`
        id,
        user_id,
        session_number,
        status,
        verified_total_kg,
        eco_coins,
        evidence_hash,
        operator_id,
        verified_by,
        collection_points(name),
        carbon_footprint_offsets(co2_avoided_kg, trees_equivalent),
        session_evidence(public_url, storage_path),
        solana_receipts(signature, cluster, explorer_url, program_id, status)
      `)
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      throw new HttpError(404, `Sesión no encontrada: ${error?.message ?? sessionId}`);
    }

    const session = data as SessionRow;
    const receipt = normalizeJoinedRow(session.solana_receipts);

    if (receipt && receipt.status === 'confirmed' && !isLegacyHashReceiptSignature(receipt.signature)) {
      return res.status(200).json({
        success: true,
        signature: receipt.signature,
        explorerUrl: receipt.explorer_url ?? getReceiptExplorerUrl(receipt.signature, receipt.cluster),
        cluster: receipt.cluster,
        alreadyEmitted: true,
      });
    }

    if (session.status === 'Cancelada' || session.status === 'Borrador' || session.status === 'Programada') {
      throw new HttpError(409, `La sesión ${session.session_number} no está lista para emisión on-chain`);
    }

    const verifiedKg = Number(session.verified_total_kg ?? 0);
    if (verifiedKg <= 0) {
      throw new HttpError(409, 'La sesión no tiene kilogramos verificados para emitir');
    }

    if (session.status !== 'Completada' && session.operator_id && session.operator_id !== operator.id) {
      throw new HttpError(409, 'La sesión ya está siendo operada por otro operador');
    }

    const carbonOffset = normalizeJoinedRow(session.carbon_footprint_offsets);
    const evidenceRows = session.session_evidence ?? [];
    const firstEvidenceRef = evidenceRows[0]?.storage_path ?? evidenceRows[0]?.public_url ?? '';

    const memoPayload = JSON.stringify({
      app: 'EcoTrade',
      v: 2,
      sid: session.id,
      sn: session.session_number,
      kg: verifiedKg,
      co2: carbonOffset ? Number(carbonOffset.co2_avoided_kg) : 0,
      total_co2_impact_kg: carbonOffset ? Number(carbonOffset.co2_avoided_kg) : 0,
      evh: session.evidence_hash || '',
      evc: evidenceRows.length,
      evr: firstEvidenceRef.slice(0, 120),
      op: operator.displayName,
      t: new Date().toISOString(),
    });

    const connection = new Connection(RPC_URL, 'confirmed');
    const keypair = getOperatorKeypair();

    if (CLUSTER === 'devnet' || CLUSTER === 'testnet') {
      await ensureFunds(connection, keypair.publicKey, CLUSTER);
    }

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

    let signature = '';
    try {
      signature = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
    } catch (error: any) {
      if (error && typeof error.getLogs === 'function') {
        try {
          const logs = await error.getLogs(connection);
          console.error('[Solana API] Tx simulation logs:', logs);
        } catch (logsError) {
          console.error('[Solana API] No se pudieron obtener logs de simulación:', logsError);
        }
      }
      throw error;
    }

    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      throw new Error(`Tx falló en confirmación: ${JSON.stringify(confirmation.value.err)}`);
    }

    await assertTransactionVisible(connection, signature);

    const explorerUrl = getReceiptExplorerUrl(signature, CLUSTER);
    const emittedAt = new Date().toISOString();

    const { error: receiptError } = await supabase.from('solana_receipts').upsert(
      {
        session_id: session.id,
        signature,
        cluster: CLUSTER,
        explorer_url: explorerUrl,
        program_id: MEMO_PROGRAM_ID.toBase58(),
        emitted_at: emittedAt,
        status: 'confirmed',
      },
      { onConflict: 'session_id' }
    );

    if (receiptError) {
      throw new Error(`No se pudo persistir el recibo Solana: ${receiptError.message}`);
    }

    const finalEcoCoins = Math.floor(verifiedKg / 10);
    const { error: completionError } = await supabase.rpc('complete_session_after_receipt', {
      p_session_id: session.id,
      p_operator_id: operator.id,
      p_verified_by: operator.displayName,
      p_verified_kg: verifiedKg,
      p_eco_coins: finalEcoCoins,
      p_note: `Verificado: ${verifiedKg} kg -> ${finalEcoCoins} ecoCoins`,
    });

    if (completionError) {
      throw new Error(`No se pudo cerrar la sesión después de emitir el recibo: ${completionError.message}`);
    }

    return res.status(200).json({
      success: true,
      signature,
      explorerUrl,
      cluster: CLUSTER,
      wallet: keypair.publicKey.toBase58(),
    });
  } catch (error) {
    console.error('[Solana API] Error:', error);

    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Error interno al emitir recibo Solana',
    });
  }
}