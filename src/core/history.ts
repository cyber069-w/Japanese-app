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

/** One practice run: speaking checks logged within GAP of each other, shown as one row that opens to the single sentences. */
export interface HistoryGroup { id: string; at: number; from: number; title: string; entries: HistoryEntry[] }
const GAP = 30 * 60_000;
const CHECK = /^(Pronunciation check|Read aloud): (.*?)(?: – (\d+)(\/100|%))?$/;

/** The sentence and 0–100 score of a speaking check, or null for any other entry. */
export function parseCheck(e: HistoryEntry): { kind: string; sentence: string; score: number | null } | null {
  const m = e.kind === 'speaking' ? CHECK.exec(e.text) : null;
  return m ? { kind: m[1], sentence: m[2], score: m[3] ? Number(m[3]) : null } : null;
}

/** Groups runs of speaking checks (newest-first list in, same order out). A lone check stays a normal entry. */
export function groupHistory(list: HistoryEntry[]): Array<HistoryEntry | HistoryGroup> {
  const out: Array<HistoryEntry | HistoryGroup> = [];
  let run: HistoryEntry[] = [];
  const flush = () => {
    if (run.length === 1) out.push(run[0]);
    else if (run.length > 1) {
      const checks = run.map(parseCheck);
      const scores = checks.map((c) => c?.score).filter((x): x is number => x != null);
      const name = checks.every((c) => c?.kind === 'Pronunciation check') ? 'Pronunciation test' : checks.every((c) => c?.kind === 'Read aloud') ? 'Read-aloud test' : 'Speaking test';
      const avg = scores.length ? ` · average ${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}/100` : '';
      out.push({ id: `g${run[run.length - 1].id}`, at: run[0].at, from: run[run.length - 1].at, title: `${name} · ${run.length} sentences${avg}`, entries: run });
    }
    run = [];
  };
  for (const e of list) {
    if (parseCheck(e) && (!run.length || run[run.length - 1].at - e.at <= GAP)) run.push(e);
    else {
      flush();
      if (parseCheck(e)) run.push(e);
      else out.push(e);
    }
  }
  flush();
  return out;
}

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
