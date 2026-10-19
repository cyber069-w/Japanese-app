import { useCallback, useEffect, useState } from 'react';
import { storage } from './db';

const listeners = new Map<string, Set<(v: unknown) => void>>();

/** A value kept in device storage (kv), shared between every component that uses the same key. */
export function useStored<T>(key: string, init: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(init);
  useEffect(() => {
    void storage.get<T>(key).then((v) => v !== undefined && v !== null && setValue(v));
    const fn = (v: unknown) => setValue(v as T);
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
    return () => void listeners.get(key)?.delete(fn);
  }, [key]);
  const set = useCallback((v: T) => {
    void storage.set(key, v);
    listeners.get(key)?.forEach((fn) => fn(v));
  }, [key]);
  return [value, set];
}
