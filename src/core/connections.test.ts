import { describe, expect, it } from 'vitest';
import { azureConn, canvasConn, syncConn, timetableConn } from './connections';
import { addEntry, filterHistory, groupHistory, MAX_HISTORY, type HistoryEntry, type HistoryGroup } from './history';
import { parseAzureFile } from './azure';

const now = Date.parse('2026-10-19T12:00:00');
describe('connections', () => {
  it('canvas: working / stale / off', () => {
    expect(canvasConn('2026-10-19T07:00:00', 'dev', undefined, undefined, now).state).toBe('working');
    expect(canvasConn('2026-10-16T07:00:00', 'dev', undefined, undefined, now).state).toBe('stale');
    expect(canvasConn(undefined, null, undefined, undefined, now).state).toBe('off');
    expect(canvasConn(undefined, null, undefined, 'GitHub 401', now).state).toBe('failed');
  });
  it('timetable, sync, azure', () => {
    expect(timetableConn(undefined, 0, now).state).toBe('off');
    expect(timetableConn(now - 20 * 86_400_000, 40, now).state).toBe('stale');
    expect(syncConn('error', undefined, 'x', undefined, now).state).toBe('failed');
    expect(syncConn('idle', now - 60_000, undefined, 'me/repo', now).state).toBe('working');
    expect(azureConn(false, null).state).toBe('off');
  });
  it('reads both key spellings from the private file', () => {
    expect(parseAzureFile({ azureSpeechKey: 'k', azureSpeechRegion: 'westeurope' })).toEqual({ key: 'k', region: 'westeurope' });
    expect(parseAzureFile({ key: 'k', region: 'r' })).toEqual({ key: 'k', region: 'r' });
    expect(parseAzureFile({ key: '' })).toBeNull();
  });
});
describe('history', () => {
  const e = (i: number, kind: HistoryEntry['kind'] = 'focus', text = `t${i}`): HistoryEntry => ({ id: String(i), at: i, kind, text });
  it('keeps the newest 300', () => {
    let l: HistoryEntry[] = [];
    for (let i = 0; i < 305; i++) l = addEntry(l, e(i));
    expect(l).toHaveLength(MAX_HISTORY);
    expect(l[0].id).toBe('304');
  });
  it('filters by kind and search', () => {
    const l = [e(1, 'canvas', 'Deadline BWL'), e(2, 'focus', 'Entry Mikro')];
    expect(filterHistory(l, 'canvas', '')).toHaveLength(1);
    expect(filterHistory(l, 'all', 'mikro')).toHaveLength(1);
  });
  it('groups a run of speaking checks into one test, keeps lone checks and other entries apart', () => {
    const min = 60_000;
    const check = (t: number, s: string, score: number): HistoryEntry => ({ id: String(t), at: t * min, kind: 'speaking', text: `Pronunciation check: ${s} – ${score}/100` });
    const l = [
      check(100, 'watashi wa yamada desu', 88), check(99, 'ano kata wa kimurasan desu', 27), check(98, 'wansan mo isha desu ka', 92),
      { id: 'f', at: 90 * min, kind: 'focus' as const, text: 'Entry' },
      check(10, 'watashi mo gakusei desu', 86),
      check(5, 'old', 50), // 5 minutes before the previous check → same test
    ];
    const g = groupHistory(l);
    expect(g).toHaveLength(3);
    const first = g[0] as HistoryGroup;
    expect(first.entries).toHaveLength(3);
    expect(first.title).toBe('Pronunciation test · 3 sentences · average 69/100');
    expect((g[1] as HistoryEntry).kind).toBe('focus');
    expect((g[2] as HistoryGroup).entries.map((e) => e.id)).toEqual(['10', '5']);
    // more than 30 minutes apart → two separate single entries
    expect(groupHistory([check(100, 'a', 10), check(60, 'b', 20)]).every((x) => !('entries' in x))).toBe(true);
  });
});
