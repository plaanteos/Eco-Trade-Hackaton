import { Keypair } from '@solana/web3.js';

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeBase58(bytes) {
  if (!(bytes instanceof Uint8Array)) bytes = Uint8Array.from(bytes);
  if (bytes.length === 0) return '';

  // Count leading zeros.
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

  // Convert base256 to base58.
  const digits = [0];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      const x = digits[j] * 256 + carry;
      digits[j] = x % 58;
      carry = (x / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  // Add leading zeros as '1'.
  let result = '';
  for (let i = 0; i < zeros; i++) result += '1';
  for (let i = digits.length - 1; i >= 0; i--) result += ALPHABET[digits[i]];
  return result;
}

const keypair = Keypair.generate();

const pubkey = keypair.publicKey.toBase58();
const secretKeyBase58 = encodeBase58(keypair.secretKey);

console.log('Operator wallet generated');
console.log('Public address:', pubkey);
console.log('SOLANA_OPERATOR_SEED (base58 secretKey):', secretKeyBase58);
console.log('\nIMPORTANT: Do not commit or share the seed. Fund the public address with a small amount of SOL (mainnet-beta) to pay fees.');
