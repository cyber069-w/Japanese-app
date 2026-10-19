/**
 * Finance vault (device + sync, ciphertext only). Password → key (PBKDF2 600k) kept in memory only. The vault locks after
 * 5 minutes without activity and whenever the app is hidden. Forgotten password = data cannot be recovered.
 */
import { useSyncExternalStore } from 'react';
import { storage } from './db';
import { localWrite, subscribeKv } from './kvSync';
import { DEFAULT_META, type CostEntry, type Meta } from './finance';
import { decryptJson, deriveVaultKey, encryptJson, randomSalt } from '../lib/vault';
import { fromBase64, toBase64 } from '../lib/crypto';

interface Header { v: 1; salt: string; check: string; created: number }
export interface FinanceState { status: 'loading' | 'none' | 'locked' | 'unlocked'; entries: CostEntry[]; meta: Meta; unreadable: number; error?: string }

export const IDLE_MS = 5 * 60_000;
const META_ID = '__meta';
let state: FinanceState = { status: 'loading', entries: [], meta: DEFAULT_META, unreadable: 0 };
const listeners = new Set<() => void>();
const set = (p: Partial<FinanceState>) => { state = { ...state, ...p }; listeners.forEach((l) => l()); };
export const useFinance = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state, () => state);

let header: Header | null = null;
let key: CryptoKey | null = null;
let cipher: Record<string, string> = {};
let idle: ReturnType<typeof setTimeout> | undefined;

const readHeader = async () => ((await storage.get<Record<string, Header>>('finance:header'))?.h ?? null);
const readItems = async () => (await storage.get<Record<string, string>>('finance:items')) ?? {};

async function decryptAll() {
  if (!key) return;
  const entries: CostEntry[] = [];
  let meta = DEFAULT_META, unreadable = 0;
  for (const [id, c] of Object.entries(cipher)) {
    try {
      const v = await decryptJson<CostEntry | Meta>(key, c);
      if (id === META_ID) meta = { ...DEFAULT_META, ...(v as Meta) };
      else entries.push(v as CostEntry);
    } catch { unreadable++; }
  }
  set({ entries: entries.sort((a, b) => b.date.localeCompare(a.date)), meta, unreadable });
}

let started = false;
export async function initFinance() {
  if (started) return;
  started = true;
  header = await readHeader();
  set({ status: header ? 'locked' : 'none' });
  const refresh = async () => {
    header = await readHeader();
    cipher = await readItems();
    if (state.status === 'unlocked') await decryptAll();
    else set({ status: header ? 'locked' : 'none' });
  };
  subscribeKv('finance:header', () => void refresh());
  subscribeKv('finance:items', () => void refresh());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') lock(); });
}

function armIdle() {
  clearTimeout(idle);
  if (state.status === 'unlocked') idle = setTimeout(lock, IDLE_MS);
}
const activity = () => armIdle();
const EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

export function lock() {
  key = null;
  clearTimeout(idle);
  EVENTS.forEach((e) => window.removeEventListener(e, activity));
  set({ status: header ? 'locked' : 'none', entries: [], meta: DEFAULT_META, unreadable: 0, error: undefined });
}

async function open(k: CryptoKey) {
  key = k;
  cipher = await readItems();
  await decryptAll();
  set({ status: 'unlocked', error: undefined });
  EVENTS.forEach((e) => window.addEventListener(e, activity, { passive: true }));
  armIdle();
}

export async function createVault(password: string): Promise<void> {
  const salt = randomSalt();
  const k = await deriveVaultKey(password, salt);
  header = { v: 1, salt: toBase64(salt), check: await encryptJson(k, 'ok'), created: Date.now() };
  await localWrite('finance:header', { h: header });
  await open(k);
}

export async function unlock(password: string): Promise<boolean> {
  if (!header) return false;
  try {
    const k = await deriveVaultKey(password, fromBase64(header.salt));
    if ((await decryptJson<string>(k, header.check)) !== 'ok') throw new Error('x');
    await open(k);
    return true;
  } catch {
    set({ error: 'Wrong password.' });
    return false;
  }
}

async function write(id: string, value: unknown | null) {
  if (!key) throw new Error('The vault is locked.');
  const next = { ...cipher };
  if (value === null) delete next[id];
  else next[id] = await encryptJson(key, value);
  cipher = next;
  await localWrite('finance:items', next);
  await decryptAll();
  armIdle();
}
export const saveEntry = (e: CostEntry) => write(e.id, e);
export const deleteEntry = (id: string) => write(id, null);
export const saveMeta = (m: Meta) => write(META_ID, m);
