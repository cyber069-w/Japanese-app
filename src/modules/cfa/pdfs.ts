/**
 * The original lesson PDFs. They are private, so they never ship with the app:
 * you load them once on one device, they are kept in IndexedDB (offline) and, with device sync on,
 * copied encrypted into your sync repo. Other devices download a lesson's PDF the first time you open it
 * and keep it – no download after that.
 */
import { storage } from '../../core/db';
import { readSyncedFile, syncConfigured, writeSyncedFile } from '../../core/sync';
import { fromBase64, toBase64 } from '../../lib/crypto';
import type { CfaLesson } from './lessons';

const pdfKey = (l: CfaLesson) => `cfa-pdf:${l.topic}-${l.module ?? 'x'}`;
const syncPath = (l: CfaLesson) => `cfa-pdf/${l.topic}-${l.module ?? 'x'}.enc`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Which lesson a file belongs to: "quant-11-….pdf" (topic + module), else a file name that contains the lesson title. */
export function lessonForFile(name: string, lessons: CfaLesson[]): CfaLesson | undefined {
  const base = slug(name.replace(/\.pdf$/i, ''));
  const m = /^([a-z]+(?:-income)?)-(\d+)/.exec(base);
  if (m) {
    const hit = lessons.find((l) => l.topic === m[1] && l.module === Number(m[2]));
    if (hit) return hit;
  }
  return lessons.find((l) => base.includes(slug(l.title).slice(0, 30)));
}

/** Keys of the PDFs stored on this device. */
export async function localPdfKeys(): Promise<Set<string>> {
  return new Set((await storage.blobKeys()).map(String).filter((k) => k.startsWith('cfa-pdf:')));
}
export const hasLocalPdf = (keys: Set<string>, l: CfaLesson) => keys.has(pdfKey(l));

/** Stores the chosen files on this device and (with sync on) in the sync repo. Returns what happened, for the message. */
export async function loadPdfs(files: File[], lessons: CfaLesson[], onProgress?: (done: number) => void) {
  const saved: string[] = [];
  const unknown: string[] = [];
  let synced = 0;
  let syncError = '';
  for (const f of files) {
    const l = lessonForFile(f.name, lessons);
    if (!l) {
      unknown.push(f.name);
      continue;
    }
    const blob = new Blob([await f.arrayBuffer()], { type: 'application/pdf' });
    await storage.setBlob(pdfKey(l), blob);
    saved.push(l.title);
    if (syncConfigured() && !syncError) {
      try {
        await writeSyncedFile(syncPath(l), { name: f.name, pdf: toBase64(new Uint8Array(await blob.arrayBuffer())) }, `Lesson PDF ${l.topic} ${l.module ?? ''}`);
        synced++;
      } catch (e) {
        syncError = (e as Error).message;
      }
    }
    onProgress?.(saved.length + unknown.length);
  }
  return { saved, unknown, synced, syncError };
}

export class NoPdfError extends Error {}

/** The lesson's PDF: from this device, or downloaded once from the sync repo and kept. */
export async function getPdf(l: CfaLesson): Promise<Blob> {
  const local = await storage.getBlob(pdfKey(l));
  if (local) return local;
  if (!syncConfigured()) throw new NoPdfError('This PDF is not on this device yet. Load it under CFA lessons → Lesson PDFs, or turn on device sync in Settings to get it from your other devices.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new NoPdfError('You are offline and this PDF has not been downloaded to this device yet.');
  const file = await readSyncedFile<{ pdf: string }>(syncPath(l));
  if (!file) throw new NoPdfError('This PDF is not in your sync repo yet. Load it once on the device that has the file (CFA lessons → Lesson PDFs).');
  const blob = new Blob([fromBase64(file.pdf) as BlobPart], { type: 'application/pdf' });
  await storage.setBlob(pdfKey(l), blob);
  return blob;
}
