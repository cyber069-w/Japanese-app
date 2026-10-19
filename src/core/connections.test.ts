import { describe, expect, it } from 'vitest';
import { azureConn, canvasConn, syncConn, timetableConn } from './connections';
import { addEntry, filterHistory, MAX_HISTORY, type HistoryEntry } from './history';
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
});
