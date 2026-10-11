/**
 * What gets synced between devices, and how two versions are merged. Pure – no I/O.
 *
 *  - cards       the newest answer wins (per card)
 *  - days        each device keeps its own daily log; stats add all devices up, so
 *                nothing is ever counted twice, even if a sync is interrupted
 *  - settings,   the most recently changed version wins (each has a timestamp);
 *    word lists, theme, voice speed and sound stay per device
 *    kanji list,
 *    profile
 *  - resets      "reset this module" travels to the other devices
 */
import type { CardState } from './srs';
import type { DayLog } from './db';
import type { Profile, Settings, VocabEntry } from './types';

/** Settings that stay on each device (voices and screens differ). */
export const DEVICE_SETTINGS = ['theme', 'voiceRate', 'sound', 'course'] as const;
export type SyncedSettings = Omit<Settings, (typeof DEVICE_SETTINGS)[number]>;

export interface Stamps { settings: number; userVocab: number; kanjiList: number; profile: number }
export const NO_STAMPS: Stamps = { settings: 0, userVocab: 0, kanjiList: 0, profile: 0 };

export interface SyncData {
  app: 'nihongo-app';
  v: 1;
  cards: CardState[];
  /** Daily logs per device id. */
  days: Record<string, DayLog[]>;
  /** Last sync per device id (for the settings screen). */
  devices: Record<string, { name: string; at: number }>;
  settings: Partial<SyncedSettings>;
  userVocab: VocabEntry[];
  kanjiList: string[];
  profile: Profile | null;
  stamps: Stamps;
  /** Module id → time of its last reset; older progress of that module is dropped. */
  resets: Record<string, number>;
}

export const syncedSettings = (s: Partial<Settings>): Partial<SyncedSettings> => {
  const out: Record<string, unknown> = { ...s };
  for (const k of DEVICE_SETTINGS) delete out[k];
  return out as Partial<SyncedSettings>;
};

const moduleOf = (cardId: string) => cardId.slice(0, cardId.indexOf(':'));
const newer = (a: CardState, b: CardState) => a.last > b.last || (a.last === b.last && a.seen > b.seen);

/**
 * Merge this device's data (`local`) with what is stored remotely.
 * The result is what both should look like afterwards.
 */
export function mergeSync(local: SyncData, remote: SyncData | null, deviceId: string, deviceName: string, now: number): SyncData {
  const r = remote ?? { ...local, days: {}, devices: {}, cards: [], resets: {}, stamps: NO_STAMPS };

  const resets: Record<string, number> = { ...r.resets };
  for (const [m, at] of Object.entries(local.resets)) resets[m] = Math.max(resets[m] ?? 0, at);

  const cards = new Map<string, CardState>();
  for (const c of r.cards) cards.set(c.id, c);
  for (const c of local.cards) {
    const other = cards.get(c.id);
    if (!other || newer(c, other)) cards.set(c.id, c);
  }
  const mergedCards = [...cards.values()].filter((c) => !(resets[moduleOf(c.id)] > c.last)).sort((a, b) => (a.id < b.id ? -1 : 1));

  const pick = <K extends keyof Stamps>(k: K) => (local.stamps[k] > r.stamps[k] ? 'local' : 'remote');
  const settingsFrom = pick('settings');
  const vocabFrom = pick('userVocab');
  const kanjiFrom = pick('kanjiList');
  const profileFrom = pick('profile');

  return {
    app: 'nihongo-app',
    v: 1,
    cards: mergedCards,
    // every device owns its own log – ours always comes from this device
    days: { ...r.days, [deviceId]: local.days[deviceId] ?? [] },
    devices: { ...r.devices, ...local.devices, [deviceId]: { name: deviceName, at: now } },
    settings: syncedSettings(settingsFrom === 'local' ? local.settings : r.settings),
    userVocab: vocabFrom === 'local' ? local.userVocab : r.userVocab,
    kanjiList: kanjiFrom === 'local' ? local.kanjiList : r.kanjiList,
    profile: profileFrom === 'local' ? local.profile : r.profile,
    stamps: {
      settings: Math.max(local.stamps.settings, r.stamps.settings),
      userVocab: Math.max(local.stamps.userVocab, r.stamps.userVocab),
      kanjiList: Math.max(local.stamps.kanjiList, r.stamps.kanjiList),
      profile: Math.max(local.stamps.profile, r.stamps.profile),
    },
    resets,
  };
}

/** All devices' logs added up per day – what the stats show. */
export function combineDays(perDevice: Record<string, DayLog[]>): Record<string, DayLog> {
  const out: Record<string, DayLog> = {};
  for (const logs of Object.values(perDevice)) {
    for (const d of logs) {
      const t = (out[d.date] ??= { date: d.date, reviews: 0, correct: 0, ms: 0, modules: {} });
      t.reviews += d.reviews;
      t.correct += d.correct;
      t.ms += d.ms;
      for (const [m, v] of Object.entries(d.modules)) {
        const tm = (t.modules[m] ??= { reviews: 0, correct: 0, ms: 0 });
        tm.reviews += v.reviews;
        tm.correct += v.correct;
        tm.ms += v.ms;
      }
    }
  }
  return out;
}

/** JSON with sorted keys, so equal data always gives the same string. */
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object)
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

/** Same content, ignoring when each device last synced. */
export function sameContent(a: SyncData, b: SyncData): boolean {
  const strip = (d: SyncData) => stableStringify({ ...d, devices: Object.keys(d.devices).sort() });
  return strip(a) === strip(b);
}
