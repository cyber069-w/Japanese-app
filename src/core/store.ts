/**
 * App-wide state: settings, SRS cards, daily log and loaded content.
 * A tiny observable store (no library) + a React hook. Every change is
 * written through to IndexedDB.
 */
import { useSyncExternalStore } from 'react';
import bundledPack from 'virtual:private-pack';
import { storage, type DayLog } from './db';
import { review, type CardState, type Grade } from './srs';
import type { Content, Profile, Settings, VocabEntry } from './types';
import { dayKey } from '../lib/date';

export interface PrivatePack {
  version: 1;
  vocab: VocabEntry[];
  hints: Record<string, Record<string, string>>;
}

export type PackStatus = 'none' | 'bundled' | 'unlocked';

export interface AppState {
  ready: boolean;
  settings: Settings;
  cards: Record<string, CardState>;
  days: Record<string, DayLog>;
  content: Content;
  packStatus: PackStatus;
  userVocab: VocabEntry[];
  /** Bumps whenever cards change – handy as a memo dependency. */
  version: number;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  leniency: 'normal',
  sound: true,
  voiceRate: 0.9,
  meaningLang: 'de',
  furigana: true,
  sessionLength: 20,
  dailyGoal: 50,
  examDate: '',
  autoAdvance: true,
  selections: {},
};

let state: AppState = {
  ready: false,
  settings: DEFAULT_SETTINGS,
  cards: {},
  days: {},
  content: { vocab: [], hints: {}, kanjiList: [], profile: null },
  packStatus: 'none',
  userVocab: [],
  version: 0,
};
let pack: PrivatePack | null = null;
let kanjiList: string[] = [];
let profile: Profile | null = null;

const listeners = new Set<() => void>();
export const getState = () => state;
function setState(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Subscribe to a slice of the state. The selector must return a stable value (a slice or primitive). */
export function useApp<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

function composeContent(): Content {
  return {
    vocab: [...(pack?.vocab ?? []), ...state.userVocab],
    hints: pack?.hints ?? {},
    kanjiList,
    profile,
  };
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

export async function initStore() {
  const [settings, cardList, dayList, userVocab, storedPack, storedKanji, storedProfile] = await Promise.all([
    storage.get<Partial<Settings>>('settings'),
    storage.allCards(),
    storage.allDays(),
    storage.get<VocabEntry[]>('userVocab'),
    storage.get<PrivatePack>('pack'),
    storage.get<string[]>('kanjiList'),
    storage.get<Profile>('profile'),
  ]);
  let packStatus: PackStatus = 'none';
  if (storedPack) { pack = storedPack; packStatus = 'unlocked'; }
  else if (bundledPack) { pack = bundledPack as PrivatePack; packStatus = 'bundled'; }
  kanjiList = storedKanji ?? [];
  profile = storedProfile ?? null;
  state = {
    ...state,
    ready: true,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    cards: Object.fromEntries(cardList.map((c) => [c.id, c])),
    days: Object.fromEntries(dayList.map((d) => [d.date, d])),
    userVocab: userVocab ?? [],
    packStatus,
  };
  setState({ content: composeContent() });
}

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

/** Store one answer: update the card's schedule and today's log. */
export function recordAnswer(id: string, moduleId: string, grade: Grade, ms: number, useSrs = true) {
  const now = Date.now();
  const ok = grade !== 'again';
  const activeMs = Math.min(ms, 60_000); // don't count walking away from the screen
  let cards = state.cards;
  if (useSrs) {
    const card = review(state.cards[id], grade, now, id);
    cards = { ...state.cards, [id]: card };
    void storage.putCard(card);
  }
  const key = dayKey(now);
  const prev: DayLog = state.days[key] ?? { date: key, reviews: 0, correct: 0, ms: 0, modules: {} };
  const pm = prev.modules[moduleId] ?? { reviews: 0, correct: 0, ms: 0 };
  const day: DayLog = {
    ...prev,
    reviews: prev.reviews + 1,
    correct: prev.correct + (ok ? 1 : 0),
    ms: prev.ms + activeMs,
    modules: { ...prev.modules, [moduleId]: { reviews: pm.reviews + 1, correct: pm.correct + (ok ? 1 : 0), ms: pm.ms + activeMs } },
  };
  void storage.putDay(day);
  setState({ cards, days: { ...state.days, [key]: day }, version: state.version + 1 });
}

// ---------------------------------------------------------------------------
// Settings & content
// ---------------------------------------------------------------------------

export function updateSettings(patch: Partial<Settings>) {
  const settings = { ...state.settings, ...patch };
  void storage.set('settings', settings);
  setState({ settings });
}

export function setSelection(moduleId: string, groups: string[]) {
  updateSettings({ selections: { ...state.settings.selections, [moduleId]: groups } });
}

export async function setUserVocab(list: VocabEntry[]) {
  await storage.set('userVocab', list);
  state = { ...state, userVocab: list };
  setState({ content: composeContent() });
}

export async function setKanjiList(list: string[]) {
  kanjiList = list;
  await storage.set('kanjiList', list);
  setState({ content: composeContent() });
}

export async function setProfile(p: Profile | null) {
  profile = p;
  setState({ content: composeContent() });
  if (p) await storage.set('profile', p);
  else await storage.del('profile');
}

export async function installPack(p: PrivatePack) {
  pack = p;
  await storage.set('pack', p);
  setState({ packStatus: 'unlocked', content: composeContent() });
}

export async function removePack() {
  await storage.del('pack');
  pack = bundledPack ? (bundledPack as PrivatePack) : null;
  setState({ packStatus: pack ? 'bundled' : 'none', content: composeContent() });
}

/** Delete all progress of one module (cards only; the daily log is kept). */
export async function resetModule(moduleId: string) {
  const ids = Object.keys(state.cards).filter((id) => id.startsWith(moduleId + ':'));
  await storage.deleteCards(ids);
  const cards = { ...state.cards };
  ids.forEach((id) => delete cards[id]);
  setState({ cards, version: state.version + 1 });
}

/** Replace cards/days/settings after an import. */
export async function applyImport(data: {
  cards: CardState[];
  days: DayLog[];
  settings?: Partial<Settings>;
  userVocab?: VocabEntry[];
  kanjiList?: string[];
  profile?: Profile;
}) {
  await storage.putCards(data.cards);
  await storage.putDays(data.days);
  const cards = { ...state.cards };
  data.cards.forEach((c) => (cards[c.id] = c));
  const days = { ...state.days };
  data.days.forEach((d) => (days[d.date] = d));
  if (data.settings) updateSettings(data.settings);
  if (data.userVocab) await setUserVocab(data.userVocab);
  if (data.kanjiList) await setKanjiList(data.kanjiList);
  if (data.profile) await setProfile(data.profile);
  setState({ cards, days, version: state.version + 1 });
}

export async function eraseEverything() {
  await storage.clearAll();
  location.reload();
}
