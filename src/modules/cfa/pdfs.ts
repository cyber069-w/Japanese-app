/**
 * The original lesson PDFs. They ship with the app encrypted (public/cfa-pdf, made by scripts/cfa/build-pdfs.mjs)
 * with the course-pack passphrase. The key is derived once per device and kept in IndexedDB (non-extractable);
 * a lesson's PDF is downloaded the first time it is opened, decrypted and kept – offline after that.
 */
import { storage } from '../../core/db';
import { fromBase64 } from '../../lib/crypto';
import type { CfaLesson } from './lessons';

const KEY = 'cfaPdfKey';
const pdfKey = (l: CfaLesson) => `cfa-pdf:${l.topic}-${l.module ?? 'x'}`;
const fileOf = (l: CfaLesson) => `cfa-pdf/${l.topic}-${l.module ?? 'x'}.enc`;

/** No key on this device yet – ask for the course-pack passphrase once. */
export class NeedPassphraseError extends Error {}

async function fetchBytes(path: string): Promise<Uint8Array> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('You are offline – this PDF has not been downloaded to this device yet.');
  const res = await fetch(path);
  if (!res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) throw new Error('There is no PDF for this lesson.');
  return new Uint8Array(await res.arrayBuffer());
}

async function decrypt(file: Uint8Array, key: CryptoKey): Promise<Blob> {
  if (new TextDecoder().decode(file.slice(0, 4)) !== 'NHPK' || file[4] !== 1) throw new Error('This file is not an encrypted lesson PDF.');
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: file.slice(21, 33) }, key, file.slice(33));
    return new Blob([plain], { type: 'application/pdf' });
  } catch {
    throw new NeedPassphraseError('Wrong passphrase.');
  }
}

/** The lesson's PDF: from this device, or downloaded once, decrypted and kept. */
export async function getPdf(l: CfaLesson): Promise<Blob> {
  const local = await storage.getBlob(pdfKey(l));
  if (local) return local;
  const key = await storage.get<CryptoKey>(KEY);
  if (!key) throw new NeedPassphraseError();
  const blob = await decrypt(await fetchBytes(fileOf(l)), key);
  await storage.setBlob(pdfKey(l), blob);
  return blob;
}

/** Derives the PDF key from the course-pack passphrase and keeps it on this device. Throws on a wrong passphrase (when `check` is given). */
export async function rememberPdfPassphrase(passphrase: string, check?: CfaLesson): Promise<void> {
  const res = await fetch('cfa-pdf/index.json');
  if (!res.ok) throw new Error('No lesson PDFs on this site.');
  const { salt } = (await res.json()) as { salt: string };
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase.trim()), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(salt) as BufferSource, iterations: 310_000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );
  if (check) await storage.setBlob(pdfKey(check), await decrypt(await fetchBytes(fileOf(check)), key));
  await storage.set(KEY, key);
}
