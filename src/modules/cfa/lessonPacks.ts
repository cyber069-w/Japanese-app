/**
 * Loads the CFA lesson packs that ship encrypted with the app (public/cfa-lessons, made by scripts/cfa/build-lessons.mjs),
 * so new lesson versions arrive by themselves – no import. Runs at start-up and right after the passphrase is entered.
 * Needs the key the device keeps for the lesson PDFs; without it nothing happens (the topic page offers to unlock).
 */
import { storage } from '../../core/db';
import { getState, setCfaLessons } from '../../core/store';
import { decryptFile, fetchBytes, savedKey } from './pdfs';
import { parseCfaLessons, type CfaLesson } from './lessons';

const VERSION_KEY = 'cfaLessonPacksVersion';
const sameLesson = (a: CfaLesson, b: CfaLesson) => a.topic === b.topic && a.module != null && a.module === b.module;

/** Shipped lessons replace the stored ones with the same topic + module (or id); other stored lessons stay. */
export function mergeShipped(stored: CfaLesson[], shipped: CfaLesson[]): CfaLesson[] {
  return [...stored.filter((l) => !shipped.some((s) => s.id === l.id || sameLesson(s, l))), ...shipped];
}

async function gunzip(bytes: ArrayBuffer): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

let running: Promise<number> | null = null;

/** Loads the shipped packs if they are newer than what this device has. Resolves to the number of lessons loaded (0 = nothing new). */
export function loadLessonPacks(): Promise<number> {
  running ??= (async () => {
    try {
      const key = await savedKey();
      if (!key) return 0;
      const res = await fetch('cfa-lessons/index.json', { cache: 'no-cache' });
      if (!res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) return 0;
      const index = (await res.json()) as { version: string; topics: string[] };
      if ((await storage.get<string>(VERSION_KEY)) === index.version) return 0;
      const shipped: CfaLesson[] = [];
      for (const topic of index.topics) {
        const text = await gunzip(await decryptFile(await fetchBytes(`cfa-lessons/${topic}.enc`), key));
        shipped.push(...parseCfaLessons(text).lessons);
      }
      await setCfaLessons(mergeShipped(getState().content.cfaLessons, shipped));
      await storage.set(VERSION_KEY, index.version);
      return shipped.length;
    } catch {
      return 0; // offline or wrong key – try again next start
    } finally {
      running = null;
    }
  })();
  return running;
}
