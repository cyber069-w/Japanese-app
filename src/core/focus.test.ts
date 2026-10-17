import { describe, expect, it } from 'vitest';
import { effectiveMs, finishFocus, isRunning, mergeSessions, pauseFocus, resumeFocus, startFocus, type FocusSession } from './focus';

describe('focus timer', () => {
  it('counts only running time and pauses', () => {
    let a = startFocus('study', 'CFA', 0);
    a = pauseFocus(a, 60_000);
    expect(isRunning(a)).toBe(false);
    a = resumeFocus(a, 600_000);
    expect(effectiveMs(a, 660_000)).toBe(120_000);
    const s = finishFocus(a, 660_000);
    expect(s).toMatchObject({ effectiveSec: 120, elapsedSec: 660, pauses: 1, subject: 'CFA', manual: false });
  });
});

describe('mergeSessions', () => {
  const old: FocusSession = { id: 's1', kind: 'study', subject: 'A', day: '2026-10-01', start: '2026-10-01T10:00:00Z', end: '2026-10-01T10:30:00Z', effectiveSec: 1800, elapsedSec: 1800, pauses: 0, manual: false };
  it('imports a Focus Log sessions.json and skips known ids and junk', () => {
    const file = JSON.stringify({ s1: old, s2: { ...old, id: 's2', start: '2026-10-02T10:00:00Z', kind: 'lecture' }, bad: { id: 'x' } });
    const { merged, added } = mergeSessions([old], file);
    expect(added).toBe(1);
    expect(merged.map((s) => s.id)).toEqual(['s1', 's2']);
  });
});
