import { describe, expect, it } from 'vitest';
import type { CardState } from './srs';
import type { DayLog } from './db';
import { ConflictError, parseRepo, type GitHubClient } from './github';
import { combineDays, mergeSync, NO_STAMPS, type SyncData } from './syncMerge';
import { deviceNameOf, runSync } from './sync';
import { deriveKey, randomSalt } from '../lib/crypto';

/** In-memory stand-in for the GitHub contents API (with sha checks like the real one). */
function fakeGitHub() {
  let file: { sha: string; bytes: Uint8Array } | null = null;
  let n = 0;
  let beforePut: (() => Promise<void>) | null = null;
  const client: GitHubClient = {
    repoInfo: async () => ({ private: true, fullName: 'me/nihongo-sync' }),
    getFile: async () => (file ? { ...file } : null),
    putFile: async (_path, bytes, sha) => {
      if (beforePut) {
        const hook = beforePut;
        beforePut = null;
        await hook();
      }
      if ((file?.sha ?? undefined) !== sha) throw new ConflictError('conflict', 409);
      file = { sha: `sha${++n}`, bytes };
      return file.sha;
    },
  };
  return { client, writes: () => n, interleave: (f: () => Promise<void>) => (beforePut = f) };
}

const card = (id: string, last: number): CardState => ({
  id, due: last + 60_000, interval: 0, ease: 2.5, step: 0, reps: 0, lapses: 0, seen: 1, correct: 1, last, lastWrong: 0,
});
const day = (date: string, reviews: number): DayLog => ({ date, reviews, correct: reviews, ms: 1000 * reviews, modules: { vocab: { reviews, correct: reviews, ms: 1000 * reviews } } });

/** A device = its own data + the same "take over the merge" logic as the real store. */
function device(id: string, name: string, init: Partial<SyncData>) {
  let data: SyncData = {
    app: 'nihongo-app', v: 1, cards: [], days: {}, devices: {}, settings: {}, userVocab: [], kanjiList: [], profile: null,
    stamps: NO_STAMPS, resets: {}, ...init,
  };
  return {
    get data() {
      return data;
    },
    study(c: CardState, d: DayLog) {
      data = { ...data, cards: [...data.cards.filter((x) => x.id !== c.id), c], days: { ...data.days, [id]: [d] } };
    },
    deps(github: GitHubClient, key: CryptoKey, salt: Uint8Array) {
      return {
        github, key, salt, deviceId: id, deviceName: name, now: () => 1,
        readLocal: () => data,
        applyMerged: async (m: SyncData) => {
          data = mergeSync(data, m, id, name, 1);
        },
      };
    },
  };
}

describe('runSync', () => {
  it('lets two devices converge without counting anything twice', async () => {
    const gh = fakeGitHub();
    const salt = randomSalt();
    const key = await deriveKey('shared password', salt);
    const phone = device('P', 'iPhone', { cards: [card('vocab:meaning:a', 100)], days: { P: [day('2026-10-11', 10)] } });
    const laptop = device('L', 'Mac', { cards: [card('vocab:meaning:a', 50), card('kana:read:x', 80)], days: { L: [day('2026-10-11', 4)] } });

    await runSync(phone.deps(gh.client, key, salt));
    await runSync(laptop.deps(gh.client, key, salt));
    await runSync(phone.deps(gh.client, key, salt));

    for (const dev of [phone, laptop]) {
      expect(dev.data.cards.map((c) => [c.id, c.last])).toEqual([['kana:read:x', 80], ['vocab:meaning:a', 100]]);
      expect(combineDays(dev.data.days)['2026-10-11'].reviews).toBe(14);
    }
    // a sync with nothing new does not write again
    const writes = gh.writes();
    await runSync(laptop.deps(gh.client, key, salt));
    expect(gh.writes()).toBe(writes);
  });

  it('merges again when another device wrote in between', async () => {
    const gh = fakeGitHub();
    const salt = randomSalt();
    const key = await deriveKey('pw', salt);
    const a = device('A', 'iPhone', { cards: [card('vocab:meaning:a', 10)] });
    const b = device('B', 'Mac', { cards: [card('vocab:meaning:b', 20)] });
    await runSync(a.deps(gh.client, key, salt));
    gh.interleave(async () => {
      await runSync(b.deps(gh.client, key, salt)); // B writes while A is about to
    });
    a.study(card('vocab:meaning:c', 30), day('2026-10-11', 1));
    await runSync(a.deps(gh.client, key, salt));
    expect(a.data.cards.map((c) => c.id)).toEqual(['vocab:meaning:a', 'vocab:meaning:b', 'vocab:meaning:c']);
  });

  it('refuses a file encrypted with another password', async () => {
    const gh = fakeGitHub();
    const salt = randomSalt();
    await runSync(device('A', 'iPhone', {}).deps(gh.client, await deriveKey('right', salt), salt));
    await expect(runSync(device('B', 'Mac', {}).deps(gh.client, await deriveKey('wrong', salt), salt))).rejects.toThrow('Wrong sync password');
  });
});

describe('helpers', () => {
  it('parses repository names and URLs', () => {
    expect(parseRepo('anna/nihongo-sync')).toEqual({ owner: 'anna', repo: 'nihongo-sync' });
    expect(parseRepo('https://github.com/anna/nihongo-sync.git')).toEqual({ owner: 'anna', repo: 'nihongo-sync' });
    expect(parseRepo('just-a-name')).toBeNull();
  });

  it('names devices', () => {
    expect(deviceNameOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('iPhone');
    expect(deviceNameOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows PC');
    expect(deviceNameOf('Mozilla/5.0 (Linux; Android 15; Pixel) Mobile')).toBe('Android phone');
  });
});
