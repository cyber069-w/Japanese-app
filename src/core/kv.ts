import { useCallback, useEffect, useState } from 'react';
import { storage } from './db';
import { isSyncedKey, localWrite, subscribeKv } from './kvSync';

const listeners = new Map<string, Set<(v: unknown) => void>>();

/**
 * A value kept in device storage (kv), shared between every component that uses the same key.
 * Keys listed in kvSync.SYNCED_KV also sync between devices (item by item).
 */
export function useStored<T>(key: string, init: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(init);
  useEffect(() => {
    void storage.get<T>(key).then((v) => v !== undefined && v !== null && setValue(v));
    const fn = (v: unknown) => setValue(v as T);
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
    const unsub = isSyncedKey(key) ? subscribeKv(key, fn) : undefined;
    return () => { listeners.get(key)?.delete(fn); unsub?.(); };
  }, [key]);
  const set = useCallback((v: T) => {
    if (isSyncedKey(key)) { void localWrite(key, v); return; }
    void storage.set(key, v);
    listeners.get(key)?.forEach((fn) => fn(v));
  }, [key]);
  return [value, set];
}
