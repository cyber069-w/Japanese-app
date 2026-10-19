/** History of what the app did for you (newest 300, this device only): Settings → History. */
import { useSyncExternalStore } from 'react';
import { storage } from './db';

export type HistoryKind = 'canvas' | 'tutor' | 'focus' | 'import' | 'speaking';
export const HISTORY_KINDS: Record<HistoryKind, string> = { canvas: 'Canvas', tutor: 'Tutor', focus: 'Focus', import: 'Import', speaking: 'Speaking' };
export interface HistoryEntry { id: string; at: number; kind: HistoryKind; text: string }

const KEY = 'history';
export const MAX_HISTORY = 300;

let entries: HistoryEntry[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const load = () => (loaded ??= storage.get<HistoryEntry[]>(KEY).then((e) => {
  // entries logged before the load finished stay in front
  entries = [...entries, ...(e ?? []).filter((x) => !entries.some((y) => y.id === x.id))].sort((a, b) => b.at - a.at).slice(0, MAX_HISTORY);
  emit();
}));

export const addEntry = (list: HistoryEntry[], e: HistoryEntry) => [e, ...list].slice(0, MAX_HISTORY);

export function logHistory(kind: HistoryKind, text: string) {
  const e: HistoryEntry = { id: `${Date.now()}${Math.random().toString(36).slice(2, 6)}`, at: Date.now(), kind, text };
  entries = addEntry(entries, e);
  emit();
  void load().then(() => storage.set(KEY, entries));
}
export function deleteEntry(id: string) {
  entries = entries.filter((e) => e.id !== id);
  emit();
  void storage.set(KEY, entries);
}
export function clearHistory() {
  entries = [];
  emit();
  void storage.set(KEY, entries);
}

/** Filter by kind and text (case-insensitive). */
export const filterHistory = (list: HistoryEntry[], kind: HistoryKind | 'all', q: string) =>
  list.filter((e) => (kind === 'all' || e.kind === kind) && e.text.toLowerCase().includes(q.trim().toLowerCase()));

export function useHistory(): HistoryEntry[] {
  void load();
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => entries,
    () => entries,
  );
}
