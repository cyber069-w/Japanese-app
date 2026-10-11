/**
 * Unlocks the encrypted course pack (public/pack.enc, made by `npm run pack`).
 * Mirror of scripts/build-pack.mjs: PBKDF2 → AES-GCM → gunzip → JSON.
 */
import type { PrivatePack } from './store';

/** Is an encrypted pack deployed next to the app? 'offline' when we can't tell. */
export async function packAvailable(): Promise<boolean | 'offline'> {
  if (!navigator.onLine) return 'offline';
  try {
    const res = await fetch('pack.enc', { method: 'HEAD', cache: 'no-store' });
    return res.ok && !(res.headers.get('content-type') ?? '').includes('text/html');
  } catch {
    return false;
  }
}

export async function unlockPack(passphrase: string): Promise<PrivatePack> {
  const res = await fetch('pack.enc', { cache: 'no-store' });
  if (!res.ok) throw new Error('No course pack found on this site.');
  const buf = new Uint8Array(await res.arrayBuffer());
  if (new TextDecoder().decode(buf.slice(0, 4)) !== 'NHPK' || buf[4] !== 1) throw new Error('This file is not a course pack.');
  const salt = buf.slice(5, 21);
  const iv = buf.slice(21, 33);
  const data = buf.slice(33);
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase.trim()), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  } catch {
    throw new Error('Wrong passphrase.');
  }
  const stream = new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'));
  const json = await new Response(stream).text();
  const pack = JSON.parse(json) as PrivatePack;
  if (pack.version !== 1) throw new Error('Unsupported pack version.');
  return pack;
}
