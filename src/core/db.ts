/**
 * IndexedDB persistence. Everything stays on this device.
 *
 *   cards  – SRS state per card (key: card id)
 *   days   – daily activity log (key: YYYY-MM-DD)
 *   kv     – settings, imported vocab lists, unlocked private pack …
 *   blobs  – voice recordings
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CardState } from './srs';

export interface DayLog {
  date: string;
  reviews: number;
  correct: number;
  /** Active study time in ms. */
  ms: number;
  modules: Record<string, { reviews: number; correct: number; ms: number }>;
}

interface Schema extends DBSchema {
  cards: { key: string; value: CardState };
  days: { key: string; value: DayLog };
  kv: { key: string; value: unknown };
  blobs: { key: string; value: Blob };
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

function db() {
  dbPromise ??= openDB<Schema>('nihongo-app', 1, {
    upgrade(d) {
      d.createObjectStore('cards', { keyPath: 'id' });
      d.createObjectStore('days', { keyPath: 'date' });
      d.createObjectStore('kv');
      d.createObjectStore('blobs');
    },
  });
  return dbPromise;
}

export const storage = {
  async allCards() { return (await db()).getAll('cards'); },
  async putCard(c: CardState) { await (await db()).put('cards', c); },
  async putCards(cs: CardState[]) {
    const tx = (await db()).transaction('cards', 'readwrite');
    await Promise.all([...cs.map((c) => tx.store.put(c)), tx.done]);
  },
  async deleteCards(ids: string[]) {
    const tx = (await db()).transaction('cards', 'readwrite');
    await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
  },
  async allDays() { return (await db()).getAll('days'); },
  async putDay(d: DayLog) { await (await db()).put('days', d); },
  async putDays(ds: DayLog[]) {
    const tx = (await db()).transaction('days', 'readwrite');
    await Promise.all([...ds.map((d) => tx.store.put(d)), tx.done]);
  },
  async get<T>(key: string): Promise<T | undefined> { return (await (await db()).get('kv', key)) as T | undefined; },
  async set(key: string, value: unknown) { await (await db()).put('kv', value, key); },
  async del(key: string) { await (await db()).delete('kv', key); },
  async getBlob(key: string) { return (await db()).get('blobs', key); },
  async setBlob(key: string, b: Blob) { await (await db()).put('blobs', b, key); },
  async delBlob(key: string) { await (await db()).delete('blobs', key); },
  async blobKeys() { return (await db()).getAllKeys('blobs'); },
  async clearAll() {
    const d = await db();
    await Promise.all([d.clear('cards'), d.clear('days'), d.clear('kv'), d.clear('blobs')]);
  },
};
