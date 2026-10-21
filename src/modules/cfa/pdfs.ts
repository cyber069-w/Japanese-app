/**
 * The original lesson PDFs. They ship with the app encrypted (public/cfa-pdf, made by scripts/cfa/build-pdfs.mjs)
 * with the course-pack passphrase. The key is derived once per device and kept in IndexedDB (non-extractable);
 * a lesson's PDF is downloaded the first time it is opened, decrypted and kept – offline after that. Cached copies carry
 * the "version" from index.json; when the PDFs are rebuilt, each one is downloaded again once.
 */
import { storage } from '../../core/db';
import { fromBase64 } from '../../lib/crypto';
import type { CfaLesson } from './lessons';

const KEY = 'cfaPdfKey';
const lessonOf = (l: CfaLesson) => `${l.topic}-${l.module ?? 'x'}`;
const pdfKey = (l: CfaLesson, version: string) => `cfa-pdf:${version}:${lessonOf(l)}`;
const fileOf = (l: CfaLesson) => `cfa-pdf/${l.topic}-${l.module ?? 'x'}.enc`;

interface PdfIndex { salt: string; version?: string }
let indexCache: Promise<PdfIndex | null> | null = null;
/** cfa-pdf/index.json (precached by the service worker, so it also works offline); null if unavailable. */
function pdfIndex(): Promise<PdfIndex | null> {
  indexCache ??= fetch('cfa-pdf/index.json')
    .then((r) => (r.ok ? (r.json() as Promise<PdfIndex>) : null))
    .catch(() => null)
    .then((i) => {
      if (!i) indexCache = null; // try again next time
      return i;
    });
  return indexCache;
}

/** Stored copies of this lesson's PDF, of any version. */
async function storedKeys(l: CfaLesson): Promise<string[]> {
  return (await storage.blobKeys()).map(String).filter((k) => k.startsWith('cfa-pdf:') && k.endsWith(`:${lessonOf(l)}`));
}

async function keep(l: CfaLesson, version: string, blob: Blob) {
  for (const k of await storedKeys(l)) await storage.delBlob(k);
  await storage.setBlob(pdfKey(l, version), blob);
}

/** No key on this device yet – ask for the course-pack passphrase once. */
export class NeedPassphraseError extends Error {}

async function fetchBytes(path: string): Promise<Uint8Array> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('You are offline – this PDF has not been downloaded to this device yet.');
  const res = await fetch(path, { cache: 'no-cache' }); // revalidate: a rebuilt PDF keeps its file name
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
  const version = (await pdfIndex())?.version ?? '1';
  const current = await storage.getBlob(pdfKey(l, version));
  if (current) return current;
  const key = await storage.get<CryptoKey>(KEY);
  if (!key) throw new NeedPassphraseError();
  try {
    const blob = await decrypt(await fetchBytes(fileOf(l)), key);
    await keep(l, version, blob);
    return blob;
  } catch (e) {
    // offline with an older copy on the device: show that rather than nothing
    const older = (await storedKeys(l))[0];
    const blob = older && !(e instanceof NeedPassphraseError) ? await storage.getBlob(older) : undefined;
    if (blob) return blob;
    throw e;
  }
}

/** Derives the PDF key from the course-pack passphrase and keeps it on this device. Throws on a wrong passphrase (when `check` is given). */
export async function rememberPdfPassphrase(passphrase: string, check?: CfaLesson): Promise<void> {
  const index = await pdfIndex();
  if (!index) throw new Error('No lesson PDFs on this site.');
  const { salt, version = '1' } = index;
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase.trim()), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(salt) as BufferSource, iterations: 310_000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
  );
  if (check) await keep(check, version, await decrypt(await fetchBytes(fileOf(check)), key));
  await storage.set(KEY, key);
}
