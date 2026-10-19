import { describe, expect, it } from 'vitest';
import type { CardState } from './srs';
import type { DayLog } from './db';
import { combineDays, mergeSync, NO_STAMPS, sameContent, stableStringify, type SyncData } from './syncMerge';
import { writeColl } from './kvSync';
import { decryptJson, deriveKey, encryptJson, fromBase64, randomSalt, saltOf, toBase64, WrongPasswordError } from '../lib/crypto';

const card = (id: string, last: number, seen = 1): CardState => ({
  id, due: last + 1000, interval: 0, ease: 2.5, step: 0, reps: 0, lapses: 0, seen, correct: seen, last, lastWrong: 0,
});
const day = (date: string, reviews: number, mod = 'vocab'): DayLog => ({
  date, reviews, correct: reviews, ms: reviews * 1000, modules: { [mod]: { reviews, correct: reviews, ms: reviews * 1000 } },
});
const data = (patch: Partial<SyncData> = {}): SyncData => ({
  app: 'nihongo-app', v: 1, cards: [], days: {}, devices: {}, settings: {}, userVocab: [], kanjiList: [], profile: null,
  stamps: NO_STAMPS, resets: {}, ...patch,
});

describe('mergeSync', () => {
  it('keeps the newest answer of each card', () => {
    const local = data({ cards: [card('vocab:meaning:a', 200), card('vocab:meaning:b', 100)] });
    const remote = data({ cards: [card('vocab:meaning:a', 150), card('vocab:meaning:b', 300), card('kana:read:x', 50)] });
    const m = mergeSync(local, remote, 'A', 'Mac', 1);
    expect(Object.fromEntries(m.cards.map((c) => [c.id, c.last]))).toEqual({ 'kana:read:x': 50, 'vocab:meaning:a': 200, 'vocab:meaning:b': 300 });
  });

  it('keeps every device’s own daily log, so nothing is counted twice', () => {
    const remote = data({ days: { B: [day('2026-10-11', 30)], A: [day('2026-10-11', 5)] } });
    const local = data({ days: { A: [day('2026-10-11', 12)] } });
    const m = mergeSync(local, remote, 'A', 'Mac', 1);
    expect(m.days.A[0].reviews).toBe(12); // ours replaces our old remote copy
    expect(m.days.B[0].reviews).toBe(30);
    // merging again changes nothing
    const again = mergeSync(local, m, 'A', 'Mac', 2);
    expect(sameContent(again, m)).toBe(true);
    expect(combineDays(m.days)['2026-10-11'].reviews).toBe(42);
    expect(combineDays(m.days)['2026-10-11'].modules.vocab.reviews).toBe(42);
  });

  it('takes the most recently changed settings, word lists and profile', () => {
    const local = data({ settings: { dailyGoal: 100 }, kanjiList: ['日'], stamps: { ...NO_STAMPS, settings: 20, kanjiList: 5 } });
    const remote = data({ settings: { dailyGoal: 20 }, kanjiList: ['月'], stamps: { ...NO_STAMPS, settings: 10, kanjiList: 9 } });
    const m = mergeSync(local, remote, 'A', 'Mac', 1);
    expect(m.settings.dailyGoal).toBe(100);
    expect(m.kanjiList).toEqual(['月']);
    expect(m.stamps).toMatchObject({ settings: 20, kanjiList: 9 });
  });

  it('never syncs the device’s theme, voice speed, sound or current course', () => {
    const local = data({ settings: { theme: 'dark', voiceRate: 0.6, sound: false, course: 'cfa', dailyGoal: 50 } as SyncData['settings'], stamps: { ...NO_STAMPS, settings: 5 } });
    const m = mergeSync(local, null, 'A', 'Mac', 1);
    expect(m.settings).toEqual({ dailyGoal: 50 });
  });

  it('spreads a module reset to the other devices', () => {
    const remote = data({ cards: [card('vocab:meaning:a', 100), card('kana:read:x', 100)] });
    const local = data({ cards: [card('vocab:meaning:c', 300)], resets: { vocab: 200 } });
    const m = mergeSync(local, remote, 'A', 'Mac', 1);
    expect(m.cards.map((c) => c.id)).toEqual(['kana:read:x', 'vocab:meaning:c']);
    expect(m.resets.vocab).toBe(200);
  });

  it('starts the remote file from the first device', () => {
    const local = data({ cards: [card('vocab:meaning:a', 1)], days: { A: [day('2026-10-10', 3)] }, profile: null });
    const m = mergeSync(local, null, 'A', 'iPhone', 7);
    expect(m.cards).toHaveLength(1);
    expect(m.days.A).toHaveLength(1);
    expect(m.devices.A).toEqual({ name: 'iPhone', at: 7 });
  });
});

describe('stableStringify', () => {
  it('ignores key order and undefined', () => {
    expect(stableStringify({ b: 1, a: [{ d: 2, c: undefined }] })).toBe(stableStringify({ a: [{ d: 2 }], b: 1 }));
  });
});

describe('sync file encryption', () => {
  it('round-trips and rejects a wrong password', async () => {
    const salt = randomSalt();
    const key = await deriveKey('tanuki-neko', salt);
    const file = await encryptJson({ hello: 'こんにちは', n: [1, 2, 3] }, key, salt);
    expect(new TextDecoder().decode(file.slice(0, 4))).toBe('NHSY');
    expect(saltOf(file)).toEqual(salt);
    expect(await decryptJson(fromBase64(toBase64(file)), key)).toEqual({ hello: 'こんにちは', n: [1, 2, 3] });
    const wrong = await deriveKey('nope', salt);
    await expect(decryptJson(file, wrong)).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it('compresses repetitive progress data well', async () => {
    const salt = randomSalt();
    const key = await deriveKey('x', salt);
    const cards = Array.from({ length: 3000 }, (_, i) => card(`vocab:meaning:word${i}`, 1_760_000_000_000 + i * 1000, 3));
    const raw = JSON.stringify(cards).length;
    const file = await encryptJson(cards, key, salt);
    expect(file.length).toBeLessThan(raw / 4);
  });
});

describe('mergeSync – focus log and CFA lessons', () => {
  const ses = (id: string, at: number, subject = 'CFA') => ({
    id, kind: 'study' as const, subject, day: '2026-10-17', start: `2026-10-17T0${id.length}:00:00Z`, end: '2026-10-17T10:00:00Z',
    effectiveSec: 60, elapsedSec: 60, pauses: 0, manual: true, at,
  });
  it('keeps sessions from both devices, the newer edit, and deletions', () => {
    const local = data({ focus: { sessions: [ses('a', 2, 'BWL'), ses('b', 1)], deleted: ['c'], subjects: ['CFA'] } });
    const remote = data({ focus: { sessions: [ses('a', 1), ses('c', 1), ses('dd', 1)], deleted: [], subjects: ['CFA', 'BWL'] } });
    const m = mergeSync(local, remote, 'A', 'Mac', 1);
    expect(m.focus!.sessions.map((s) => [s.id, s.subject])).toEqual([['a', 'BWL'], ['b', 'CFA'], ['dd', 'CFA']]);
    expect(m.focus!.deleted).toEqual(['c']);
  });
  it('copes with data from older versions without these fields', () => {
    const local = data({ cfaLessons: [], focus: { sessions: [ses('a', 1)], deleted: [], subjects: ['CFA'] } });
    const old = data();
    delete (old as Partial<SyncData>).cfaLessons;
    const m = mergeSync(local, { ...old, stamps: { settings: 0, userVocab: 0, kanjiList: 0, profile: 0 } as SyncData['stamps'] }, 'A', 'Mac', 1);
    expect(m.focus!.sessions).toHaveLength(1);
    expect(m.cfaLessons).toEqual([]);
    expect(m.stamps.cfaLessons).toBe(0);
  });
});

describe('kv stores in the sync file', () => {
  const base = (kv?: SyncData['kv']): SyncData => ({ ...data({}), kv });
  it('merges to-dos from two devices and keeps older sync files working', () => {
    const phone = base({ todos: writeColl('todos', undefined, [{ id: 'a', text: 'phone' }], 100) });
    const mac = base({ todos: writeColl('todos', undefined, [{ id: 'b', text: 'mac' }], 200) });
    const merged = mergeSync(mac, phone, 'mac', 'Mac', 300);
    expect(Object.keys(merged.kv!.todos.items).sort()).toEqual(['a', 'b']);
    expect(mergeSync(mac, base(undefined), 'mac', 'Mac', 300).kv!.todos.items.b).toBeTruthy();
  });
});
