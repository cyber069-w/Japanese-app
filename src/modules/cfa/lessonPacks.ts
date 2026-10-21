/**
 * Loads the CFA lesson packs that ship encrypted with the app (public/cfa-lessons, made by scripts/cfa/build-lessons.mjs),
 * so new lesson versions arrive by themselves – no import. Runs at start-up, on CFA pages and right after the passphrase
 * is entered. Needs the key the device keeps for the lesson PDFs; without it nothing happens (the topic page offers to unlock).
 *
 * The decrypted packs are kept per version, and every run compares them with the stored lessons and repairs any
 * difference – so an older copy written back by device sync (or anything else) is replaced again.
 */
import { storage } from '../../core/db';
import { getState, setCfaLessons } from '../../core/store';
import { decryptFile, fetchBytes, savedKey } from './pdfs';
import { parseCfaLessons, type CfaLesson } from './lessons';

const CACHE_KEY = 'cfaShippedLessons';
interface Shipped { version: string; lessons: CfaLesson[] }
const sameLesson = (a: CfaLesson, b: CfaLesson) => a.topic === b.topic && a.module != null && a.module === b.module;

/** Shipped lessons replace the stored ones with the same topic + module (or id); other stored lessons stay. */
export function mergeShipped(stored: CfaLesson[], shipped: CfaLesson[]): CfaLesson[] {
  return [...stored.filter((l) => !shipped.some((s) => s.id === l.id || sameLesson(s, l))), ...shipped];
}

/** True when every shipped lesson is stored exactly like that, with no older copy of it next to it. */
export function upToDate(stored: CfaLesson[], shipped: CfaLesson[]): boolean {
  return shipped.every((s) => {
    const copies = stored.filter((l) => l.id === s.id || sameLesson(s, l));
    return copies.length === 1 && JSON.stringify(copies[0]) === JSON.stringify(s);
  });
}

async function gunzip(bytes: ArrayBuffer): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

/** The shipped lessons: from this device if the version is current (or we are offline), else downloaded and decrypted. */
async function shippedLessons(key: CryptoKey): Promise<CfaLesson[] | null> {
  const cached = await storage.get<Shipped>(CACHE_KEY);
  const index = await fetch('cfa-lessons/index.json', { cache: 'no-cache' })
    .then((r) => (r.ok && !(r.headers.get('content-type') ?? '').includes('text/html') ? (r.json() as Promise<{ version: string; topics: string[] }>) : null))
    .catch(() => null);
  if (!index) return cached?.lessons ?? null; // offline: keep using what we have
  if (cached?.version === index.version) return cached.lessons;
  const lessons: CfaLesson[] = [];
  for (const topic of index.topics) {
    lessons.push(...parseCfaLessons(await gunzip(await decryptFile(await fetchBytes(`cfa-lessons/${topic}.enc`), key))).lessons);
  }
  await storage.set(CACHE_KEY, { version: index.version, lessons } satisfies Shipped);
  return lessons;
}

let running: Promise<number> | null = null;

/** Brings the stored lessons in line with the shipped ones. Resolves to the number of shipped lessons applied (0 = nothing to do). */
export function loadLessonPacks(): Promise<number> {
  running ??= (async () => {
    try {
      const key = await savedKey();
      if (!key) return 0;
      const shipped = await shippedLessons(key);
      if (!shipped?.length) return 0;
      const stored = getState().content.cfaLessons;
      if (upToDate(stored, shipped)) return 0;
      await setCfaLessons(mergeShipped(stored, shipped));
      return shipped.length;
    } catch {
      return 0; // wrong key or a broken download – try again next time
    } finally {
      running = null;
    }
  })();
  return running;
}
