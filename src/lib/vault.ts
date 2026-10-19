/**
 * Finance vault crypto: PBKDF2-SHA-256 (600 000 iterations) → AES-256-GCM. Every entry is encrypted on its own
 * ("iv | ciphertext", base64), so devices can sync and merge entries without ever knowing the password.
 */
import { fromBase64, toBase64 } from './crypto';

export const VAULT_ITERATIONS = 600_000;

export async function deriveVaultKey(password: string, salt: Uint8Array, iterations = VAULT_ITERATIONS): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptJson(key: CryptoKey, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(value))));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv); out.set(ct, 12);
  return toBase64(out);
}

/** Throws if the key is wrong or the data was changed. */
export async function decryptJson<T>(key: CryptoKey, b64: string): Promise<T> {
  const bytes = fromBase64(b64);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

export const randomSalt = () => crypto.getRandomValues(new Uint8Array(16));
