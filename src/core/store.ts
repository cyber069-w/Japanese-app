/**
 * App-wide state: settings, SRS cards, daily log and loaded content.
 * A tiny observable store (no library) + a React hook. Every change is
 * written through to IndexedDB.
 *
 * For sync (core/sync.ts) the store also keeps:
 *   ownDays     this device's daily log (IndexedDB "days")
 *   remoteDays  the other devices' logs, per device id – state.days adds all up
 *   stamps      when settings / word lists / kanji list / profile last changed here
 *   resets      when each module was last reset
 */
import { useSyncExternalStore } from 'react';
import bundledPack from 'virtual:private-pack';
import { storage, type DayLog } from './db';
import { review, type CardState, type Grade } from './srs';
import type { Content, Profile, Settings, VocabEntry } from './types';
import { DEVICE_SETTINGS, NO_STAMPS, combineDays, mergeSync, syncedSettings, type Stamps, type SyncData } from './syncMerge';
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
  look: 'washi',
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
  course: 'japanese', // unknown ids fall back to the first course
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
let ownDays: Record<string, DayLog> = {};
let remoteDays: Record<string, DayLog[]> = {};
let stamps: Stamps = NO_STAMPS;
let resets: Record<string, number> = {};

// ---- local changes (sync listens to these) ----
const changeListeners = new Set<() => void>();
/** Called after every change made on this device (not after applying synced data). */
export function onLocalChange(l: () => void) {
  changeListeners.add(l);
  return () => {
    changeListeners.delete(l);
  };
}
const changed = () => changeListeners.forEach((l) => l());

function stamp(key: keyof Stamps) {
  stamps = { ...stamps, [key]: Date.now() };
  void storage.set('stamps', stamps);
}

const allDays = () => combineDays({ '': Object.values(ownDays), ...remoteDays });

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
  const [settings, cardList, dayList, userVocab, storedPack, storedKanji, storedProfile, storedRemote, storedStamps, storedResets] = await Promise.all([
    storage.get<Partial<Settings>>('settings'),
    storage.allCards(),
    storage.allDays(),
    storage.get<VocabEntry[]>('userVocab'),
    storage.get<PrivatePack>('pack'),
    storage.get<string[]>('kanjiList'),
    storage.get<Profile>('profile'),
    storage.get<Record<string, DayLog[]>>('remoteDays'),
    storage.get<Stamps>('stamps'),
    storage.get<Record<string, number>>('resets'),
  ]);
  let packStatus: PackStatus = 'none';
  if (storedPack) { pack = storedPack; packStatus = 'unlocked'; }
  else if (bundledPack) { pack = bundledPack as PrivatePack; packStatus = 'bundled'; }
  kanjiList = storedKanji ?? [];
  profile = storedProfile ?? null;
  ownDays = Object.fromEntries(dayList.map((d) => [d.date, d]));
  remoteDays = storedRemote ?? {};
  stamps = { ...NO_STAMPS, ...storedStamps };
  resets = storedResets ?? {};
  state = {
    ...state,
    ready: true,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    cards: Object.fromEntries(cardList.map((c) => [c.id, c])),
    days: allDays(),
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
  const prev: DayLog = ownDays[key] ?? { date: key, reviews: 0, correct: 0, ms: 0, modules: {} };
  const pm = prev.modules[moduleId] ?? { reviews: 0, correct: 0, ms: 0 };
  const day: DayLog = {
    ...prev,
    reviews: prev.reviews + 1,
    correct: prev.correct + (ok ? 1 : 0),
    ms: prev.ms + activeMs,
    modules: { ...prev.modules, [moduleId]: { reviews: pm.reviews + 1, correct: pm.correct + (ok ? 1 : 0), ms: pm.ms + activeMs } },
  };
  void storage.putDay(day);
  ownDays = { ...ownDays, [key]: day };
  setState({ cards, days: allDays(), version: state.version + 1 });
  changed();
}

// ---------------------------------------------------------------------------
// Settings & content
// ---------------------------------------------------------------------------

export function updateSettings(patch: Partial<Settings>) {
  const settings = { ...state.settings, ...patch };
  void storage.set('settings', settings);
  setState({ settings });
  // theme, voice speed and sound belong to this device only
  if (Object.keys(patch).some((k) => !(DEVICE_SETTINGS as readonly string[]).includes(k))) {
    stamp('settings');
    changed();
  }
}

export function setSelection(moduleId: string, groups: string[]) {
  updateSettings({ selections: { ...state.settings.selections, [moduleId]: groups } });
}

export async function setUserVocab(list: VocabEntry[]) {
  await storage.set('userVocab', list);
  state = { ...state, userVocab: list };
  setState({ content: composeContent() });
  stamp('userVocab');
  changed();
}

export async function setKanjiList(list: string[]) {
  kanjiList = list;
  await storage.set('kanjiList', list);
  setState({ content: composeContent() });
  stamp('kanjiList');
  changed();
}

export async function setProfile(p: Profile | null) {
  profile = p;
  setState({ content: composeContent() });
  if (p) await storage.set('profile', p);
  else await storage.del('profile');
  stamp('profile');
  changed();
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
  resets = { ...resets, [moduleId]: Date.now() };
  await storage.set('resets', resets);
  setState({ cards, version: state.version + 1 });
  changed();
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
  ownDays = { ...ownDays };
  data.days.forEach((d) => (ownDays[d.date] = d));
  if (data.settings) updateSettings(data.settings);
  if (data.userVocab) await setUserVocab(data.userVocab);
  if (data.kanjiList) await setKanjiList(data.kanjiList);
  if (data.profile) await setProfile(data.profile);
  setState({ cards, days: allDays(), version: state.version + 1 });
  changed();
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/** Everything that syncs, as this device sees it. */
export function exportSyncData(deviceId: string): SyncData {
  return {
    app: 'nihongo-app',
    v: 1,
    cards: Object.values(state.cards),
    days: { ...remoteDays, [deviceId]: Object.values(ownDays) },
    devices: {},
    settings: syncedSettings(state.settings),
    userVocab: state.userVocab,
    kanjiList,
    profile,
    stamps,
    resets,
  };
}

const sameCard = (a: CardState | undefined, b: CardState) => !!a && a.last === b.last && a.due === b.due && a.seen === b.seen;

/**
 * Take over the merged data from a sync. Anything changed here while the sync
 * was running is merged in again, so no answer gets lost.
 */
export async function applySyncData(merged: SyncData, deviceId: string, deviceName: string) {
  const final = mergeSync(exportSyncData(deviceId), merged, deviceId, deviceName, Date.now());

  const cards: Record<string, CardState> = {};
  const put: CardState[] = [];
  for (const c of final.cards) {
    cards[c.id] = c;
    if (!sameCard(state.cards[c.id], c)) put.push(c);
  }
  const gone = Object.keys(state.cards).filter((id) => !cards[id]);
  if (put.length) await storage.putCards(put);
  if (gone.length) await storage.deleteCards(gone);

  remoteDays = Object.fromEntries(Object.entries(final.days).filter(([id]) => id !== deviceId));
  await storage.set('remoteDays', remoteDays);

  let settings = state.settings;
  if (final.stamps.settings !== stamps.settings) {
    settings = { ...state.settings, ...final.settings };
    await storage.set('settings', settings);
  }
  let userVocab = state.userVocab;
  if (final.stamps.userVocab !== stamps.userVocab) {
    userVocab = final.userVocab;
    await storage.set('userVocab', userVocab);
  }
  if (final.stamps.kanjiList !== stamps.kanjiList) {
    kanjiList = final.kanjiList;
    await storage.set('kanjiList', kanjiList);
  }
  if (final.stamps.profile !== stamps.profile) {
    profile = final.profile;
    if (profile) await storage.set('profile', profile);
    else await storage.del('profile');
  }
  stamps = final.stamps;
  resets = final.resets;
  await storage.set('stamps', stamps);
  await storage.set('resets', resets);

  state = { ...state, userVocab };
  setState({ cards, days: allDays(), settings, content: composeContent(), version: state.version + 1 });
}

export async function eraseEverything() {
  await storage.clearAll();
  location.reload();
}
