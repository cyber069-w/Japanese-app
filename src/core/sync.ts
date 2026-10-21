/**
 * Sync between devices through a private GitHub repository – free, no server of our own.
 *
 * One encrypted file (progress.enc) lives in your repo. Each sync reads it, merges
 * it with this device (core/syncMerge.ts), writes it back and takes over the result.
 * If another device wrote in between, GitHub rejects the write and we merge again.
 *
 * Runs in the background: shortly after the app starts, ~20 s after you study,
 * when you switch away from the app, and when the connection comes back.
 */
import { useSyncExternalStore } from 'react';
import { storage } from './db';
import { applySyncData, exportSyncData, onLocalChange } from './store';
import { mergeSync, sameContent, type SyncData } from './syncMerge';
import { ConflictError, createGitHub, parseRepo, type GitHubClient } from './github';
import { decryptJson, deriveKey, encryptJson, randomSalt, saltOf, WrongPasswordError } from '../lib/crypto';

export const SYNC_FILE = 'progress.enc';
const DEBOUNCE_MS = 20_000;
const STALE_MS = 60_000;

interface SyncConfig {
  owner: string;
  repo: string;
  token: string;
  /** Non-extractable AES key derived from the sync password. */
  key: CryptoKey;
  salt: Uint8Array;
}

export interface SyncStatus {
  phase: 'off' | 'idle' | 'syncing' | 'error';
  repo?: string;
  lastSync?: number;
  error?: string;
  devices?: SyncData['devices'];
  deviceId?: string;
}

// ---------------------------------------------------------------------------
// The sync itself (dependencies injected, so it can be tested without a browser)
// ---------------------------------------------------------------------------

export interface SyncDeps {
  github: GitHubClient;
  key: CryptoKey;
  salt: Uint8Array;
  deviceId: string;
  deviceName: string;
  readLocal: () => SyncData;
  applyMerged: (merged: SyncData) => Promise<void>;
  now?: () => number;
}

export async function runSync(d: SyncDeps): Promise<SyncData> {
  const now = d.now ?? Date.now;
  for (let attempt = 0; attempt < 4; attempt++) {
    const file = await d.github.getFile(SYNC_FILE);
    let remote: SyncData | null = null;
    if (file) {
      if (saltOf(file.bytes).join() !== d.salt.join()) throw new WrongPasswordError();
      remote = await decryptJson<SyncData>(file.bytes, d.key);
      if (remote.app !== 'nihongo-app') throw new Error('The sync file belongs to another app.');
    }
    const merged = mergeSync(d.readLocal(), remote, d.deviceId, d.deviceName, now());
    if (!remote || !sameContent(merged, remote)) {
      try {
        await d.github.putFile(SYNC_FILE, await encryptJson(merged, d.key, d.salt), file?.sha, `Sync from ${d.deviceName}`);
      } catch (e) {
        if (e instanceof ConflictError) continue; // another device was faster – merge with its version
        throw e;
      }
    }
    await d.applyMerged(merged);
    return merged;
  }
  throw new Error('Another device kept syncing at the same moment – it will be tried again later.');
}

// ---------------------------------------------------------------------------
// Status (for the settings screen and the sidebar)
// ---------------------------------------------------------------------------

let status: SyncStatus = { phase: 'off' };
const statusListeners = new Set<() => void>();
function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  statusListeners.forEach((l) => l());
}
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => status,
    () => status,
  );
}

// ---------------------------------------------------------------------------
// Device identity
// ---------------------------------------------------------------------------

export function deviceNameOf(ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''): string {
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android phone' : 'Android tablet';
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux PC';
  return 'Browser';
}

async function deviceId(): Promise<string> {
  let id = await storage.get<string>('deviceId');
  if (!id) {
    id = crypto.randomUUID();
    await storage.set('deviceId', id);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

let config: SyncConfig | null = null;
let myId = '';
let running: Promise<void> | null = null;
let again = false;
let dirty = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let started = false;

/** Reads and decrypts another encrypted file from the sync repo (e.g. the Canvas inbox the Mac job wrote). Null if sync is off or the file is missing. */
export async function readSyncedFile<T>(path: string): Promise<T | null> {
  if (!config) return null;
  const file = await createGitHub(config.token, config).getFile(path);
  return file ? decryptJson<T>(file.bytes, config.key) : null;
}

export const syncConfigured = () => !!config;

/** Sync now (or right after the sync that is already running). */
export function syncNow(): Promise<void> {
  if (!config) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  clearTimeout(timer);
  running = (async () => {
    do {
      again = false;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setStatus({ phase: status.lastSync ? 'idle' : 'error', error: status.lastSync ? undefined : 'Offline – sync starts when you are online.' });
        return;
      }
      dirty = false;
      setStatus({ phase: 'syncing' });
      try {
        const c = config!;
        const merged = await runSync({
          github: createGitHub(c.token, c),
          key: c.key,
          salt: c.salt,
          deviceId: myId,
          deviceName: deviceNameOf(),
          readLocal: () => exportSyncData(myId),
          applyMerged: (m) => applySyncData(m, myId, deviceNameOf()),
        });
        const meta = { lastSync: Date.now(), devices: merged.devices };
        await storage.set('syncMeta', meta);
        setStatus({ phase: 'idle', error: undefined, ...meta });
      } catch (e) {
        dirty = true;
        const msg =
          e instanceof WrongPasswordError
            ? 'The sync file was saved with a different sync password. Disconnect and connect again with the right one.'
            : (e as Error).message;
        setStatus({ phase: 'error', error: msg });
        // try again later (e.g. after a network hiccup); explicit errors also show in Settings
        timer = setTimeout(() => void syncNow(), 5 * 60_000);
        again = false;
      }
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

function schedule(ms = DEBOUNCE_MS) {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), ms);
}

/** Load the saved connection and start syncing in the background. Call once after initStore(). */
export async function startSync() {
  if (started) return;
  started = true;
  myId = await deviceId();
  config = (await storage.get<SyncConfig>('sync')) ?? null;
  const meta = await storage.get<{ lastSync: number; devices: SyncData['devices'] }>('syncMeta');
  setStatus(config ? { phase: 'idle', repo: `${config.owner}/${config.repo}`, deviceId: myId, ...meta } : { phase: 'off', deviceId: myId });

  onLocalChange(() => {
    if (!config) return;
    dirty = true;
    schedule();
  });
  document.addEventListener('visibilitychange', () => {
    if (!config) return;
    if (document.visibilityState === 'hidden' && dirty) void syncNow();
    if (document.visibilityState === 'visible' && Date.now() - (status.lastSync ?? 0) > STALE_MS) void syncNow();
  });
  window.addEventListener('online', () => {
    if (config && (dirty || Date.now() - (status.lastSync ?? 0) > STALE_MS)) void syncNow();
  });
  if (config) schedule(1500);
}

/**
 * Connect this device. Checks the repository and the password, then syncs once.
 * Returns whether the repository is public (the file is encrypted, but private is better).
 */
export class PasswordMismatchError extends Error {}

export async function connectSync(
  repoInput: string,
  token: string,
  password: string,
  /** Replace the file on GitHub with this device's data (forgotten password). */
  startFresh = false,
): Promise<{ publicRepo: boolean }> {
  const ref = parseRepo(repoInput);
  if (!ref) throw new Error('Enter the repository as owner/name, e.g. anna/nihongo-sync.');
  if (!token.trim()) throw new Error('Paste your GitHub token.');
  if (password.trim().length < 6) throw new Error('Choose a sync password with at least 6 characters.');
  const github = createGitHub(token, ref);
  const info = await github.repoInfo();
  const file = await github.getFile(SYNC_FILE);
  const salt = file && !startFresh ? saltOf(file.bytes) : randomSalt();
  const key = await deriveKey(password, salt);
  if (!myId) myId = await deviceId();
  if (file && !startFresh) {
    try {
      await decryptJson(file.bytes, key);
    } catch (e) {
      if (e instanceof WrongPasswordError) throw new PasswordMismatchError('This sync password doesn’t match the one used on your other devices.');
      throw e;
    }
  }
  if (file && startFresh) {
    // overwrite with this device's data, encrypted with the new password
    const fresh = mergeSync(exportSyncData(myId), null, myId, deviceNameOf(), Date.now());
    await github.putFile(SYNC_FILE, await encryptJson(fresh, key, salt), file.sha, `New sync password from ${deviceNameOf()}`);
  }
  config = { ...ref, token: token.trim(), key, salt };
  await storage.set('sync', config);
  setStatus({ phase: 'idle', repo: info.fullName, error: undefined, deviceId: myId });
  await syncNow();
  if (status.phase === 'error') throw new Error(status.error);
  return { publicRepo: !info.private };
}

/** Forget the connection on this device (the file on GitHub stays). */
export async function disconnectSync() {
  clearTimeout(timer);
  config = null;
  await storage.del('sync');
  await storage.del('syncMeta');
  setStatus({ phase: 'off', repo: undefined, lastSync: undefined, error: undefined, devices: undefined });
}
