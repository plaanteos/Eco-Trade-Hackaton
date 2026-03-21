import { Keypair } from '@solana/web3.js';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function decodeBase58(str) {
  const bytes = [0];
  for (const char of str) {
    if (/\s/.test(char)) continue;
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

function keypairFromSeedEnv(seed) {
  if (!seed || seed.trim().length === 0) {
    throw new Error('Missing SOLANA_OPERATOR_SEED');
  }

  const trimmed = seed.trim();

  // Common export: JSON array of 64 bytes
  if (trimmed.startsWith('[')) {
    const arr = JSON.parse(trimmed);
    if (Array.isArray(arr) && arr.length === 64 && arr.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      return Keypair.fromSecretKey(Uint8Array.from(arr));
    }
  }

  // If it looks like a full secretKey in base58
  if (trimmed.length > 60) {
    const secretKey = decodeBase58(trimmed);
    if (secretKey.length === 64) return Keypair.fromSecretKey(secretKey);
  }

  // Otherwise treat as 32-byte seed (or longer, we slice)
  const seedBytes = decodeBase58(trimmed);
  return Keypair.fromSeed(seedBytes.slice(0, 32));
}

const seed = process.env.SOLANA_OPERATOR_SEED;
const kp = keypairFromSeedEnv(seed);
console.log('Derived public address:', kp.publicKey.toBase58());
