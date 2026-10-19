import { useCallback, useEffect, useState } from 'react';
import { storage } from './db';

/** A value kept in device storage (kv). Starts with `init`, then loads the saved one. */
export function useStored<T>(key: string, init: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(init);
  useEffect(() => {
    void storage.get<T>(key).then((v) => v !== undefined && v !== null && setValue(v));
  }, [key]);
  const set = useCallback((v: T) => {
    setValue(v);
    void storage.set(key, v);
  }, [key]);
  return [value, set];
}
