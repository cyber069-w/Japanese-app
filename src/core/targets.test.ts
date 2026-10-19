import { describe, expect, it } from 'vitest';
import type { FocusSession } from './focus';
import { blockTomorrow, hoursBySubject, roundHalf, suggestTargets, targetRows, weekStart } from './targets';
import { buildReport, reportMarkdown } from './report';

const mk = (day: string, subject: string, hours: number, kind: FocusSession['kind'] = 'study'): FocusSession => ({
  id: day + subject + kind, kind, subject, day, start: `${day}T10:00:00`, end: '', effectiveSec: hours * 3600, elapsedSec: hours * 3600, pauses: 0, manual: false,
});
const now = new Date(2026, 9, 21, 12).getTime(); // Wed 21 Oct 2026

describe('weeks', () => {
  it('starts on Monday', () => {
    expect(weekStart(now).getDate()).toBe(19);
    expect(weekStart(new Date(2026, 9, 25).getTime()).getDate()).toBe(19); // Sunday
    expect(weekStart(now, -1).getDate()).toBe(12);
  });
  it('sums hours per subject inside the week only', () => {
    const l = [mk('2026-10-19', 'BWL', 2), mk('2026-10-25', 'BWL', 1), mk('2026-10-26', 'BWL', 5)];
    expect(hoursBySubject(l, weekStart(now))).toEqual({ BWL: 3 });
  });
});
describe('targets', () => {
  it('suggests the last two weeks, rounded to 0.5 h', () => {
    const l = [mk('2026-10-13', 'Mikro', 3), mk('2026-10-06', 'Mikro', 2.2), mk('2026-10-14', 'CFA', 0.1)];
    expect(suggestTargets(l, now)).toEqual({ Mikro: 2.5 });
    expect(roundHalf(1.74)).toBe(1.5);
  });
  it('sorts rows by what is missing', () => {
    const rows = targetRows({ A: 4, B: 2 }, { A: 3.5, B: 0.5 });
    expect(rows.map((r) => r.subject)).toEqual(['B', 'A']);
    expect(rows[1].missing).toBe(0.5);
  });
  it('plans a block tomorrow inside the window', () => {
    const b = blockTomorrow('BWL', now, 8 * 60, 22 * 60);
    expect(new Date(b.start).getDate()).toBe(22);
    expect(new Date(b.start).getHours()).toBe(16);
    expect(b.end - b.start).toBe(3_600_000);
    expect(new Date(blockTomorrow('BWL', now, 8 * 60, 16 * 60 + 30).start).getHours()).toBe(8);
  });
});
describe('report', () => {
  it('collects focus, lectures, cards and Canvas numbers', () => {
    const r = buildReport({
      start: weekStart(now), now, targets: { Mikro: 3 },
      sessions: [mk('2026-10-20', 'Mikro', 1.5), mk('2026-10-21', 'Mikro', 1, 'lecture')],
      days: { '2026-10-20': { date: '', reviews: 10, correct: 8, ms: 0, modules: { vocab: { reviews: 10, correct: 8, ms: 0 }, x: { reviews: 5, correct: 5, ms: 0 } } } },
      subjectOfModule: (m) => (m === 'vocab' ? 'Japanisch' : null),
      deadlines: [{ due: '2026-10-22T10:00:00Z' }, { due: '2026-10-01T10:00:00Z' }, { due: null }],
      files: [{ at: '2026-10-20T07:00:00' }, { at: '2026-10-01T07:00:00' }],
    });
    expect(r.rows.find((x) => x.subject === 'Mikro')).toMatchObject({ hours: 2.5, target: 3, lectures: 1 });
    expect(r.rows.find((x) => x.subject === 'Japanisch')).toMatchObject({ answers: 10, correct: 8 });
    expect(r).toMatchObject({ deadlinesDue: 1, deadlinesOpen: 2, newFiles: 1 });
    const md = reportMarkdown(r);
    expect(md).toContain('| Mikro | 2.5 h | 3.0 h | 1 | 0 | – |');
    expect(md).toContain('| Japanisch | 0.0 h | – | 0 | 10 | 80% |');
  });
});
