import { describe, expect, it } from 'vitest';
import { daysLeftInWeek, freeTime, planDemands, rollingPlan } from './rollingPlan';

// Thursday 22 Oct 2026, 14:00 local
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();
const now = at(22, 14);
const win = (): [[number, number], [number, number]] => [[now, at(22, 22)], [at(23, 8), at(23, 22)]];

describe('rolling plan', () => {
  it('counts the days left in the week', () => {
    expect(daysLeftInWeek(now)).toBe(4); // Thu–Sun
    expect(daysLeftInWeek(at(25, 9))).toBe(1); // Sunday
    expect(daysLeftInWeek(at(19, 9))).toBe(7); // Monday
  });

  it('takes busy time out of the windows', () => {
    expect(freeTime([[at(22, 14), at(22, 18)]], [[at(22, 15), at(22, 16)], [at(22, 15, 30), at(22, 16, 30)]])).toEqual([
      [at(22, 14), at(22, 15)],
      [at(22, 16, 30), at(22, 18)],
    ]);
  });

  it('puts the subject furthest behind first and splits time between subjects', () => {
    const p = rollingPlan(now, win(), [], [{ subject: 'Privatrecht', remaining: 10 }, { subject: 'CFA', remaining: 5 }]);
    expect(p.blocks[0]).toMatchObject({ subject: 'Privatrecht', start: now, day: 'today' });
    expect(new Set(p.blocks.map((b) => b.subject))).toEqual(new Set(['Privatrecht', 'CFA']));
    // two days' share: Privatrecht 10/4×2 = 5 h, CFA 5/4×2 = 2.5 h – all of it fits
    const hours = (s: string) => p.blocks.filter((b) => b.subject === s).reduce((n, b) => n + (b.end - b.start) / 3_600_000, 0);
    expect(hours('Privatrecht')).toBe(5);
    expect(hours('CFA')).toBe(2.5);
    expect(p.dropped).toEqual([]);
  });

  it('a near deadline beats a bigger weekly gap', () => {
    const p = rollingPlan(now, win(), [], [{ subject: 'CFA', remaining: 10 }, { subject: 'BWL', remaining: 5, due: at(23, 23), dueLabel: 'deadline' }]);
    expect(p.blocks[0]).toMatchObject({ subject: 'BWL', why: 'deadline in 1 d' });
  });

  it('skips lectures and logged time, starts tomorrow when today is over', () => {
    const p = rollingPlan(now, win(), [[at(22, 14), at(22, 22)]], [{ subject: 'CFA', remaining: 5 }]);
    expect(p.blocks[0]).toMatchObject({ day: 'tomorrow', start: at(23, 8) });
  });

  it('what does not fit is dropped – lowest priority first', () => {
    const short: [[number, number], [number, number]] = [[now, at(22, 15, 30)], [at(23, 8), at(23, 9, 30)]];
    const p = rollingPlan(now, short, [], [{ subject: 'Privatrecht', remaining: 10 }, { subject: 'CFA', remaining: 2.5 }]);
    expect(p.blocks.map((b) => b.subject)).toEqual(['Privatrecht', 'Privatrecht']);
    expect(p.dropped.map((d) => d.subject)).toEqual(['Privatrecht', 'CFA']);
  });

  it('a missed block raises the subject next time (less done → more needed per day)', () => {
    const before = rollingPlan(now, win(), [], [{ subject: 'CFA', remaining: 4 }, { subject: 'BWL', remaining: 5 }]);
    const after = rollingPlan(now, win(), [], [{ subject: 'CFA', remaining: 6 }, { subject: 'BWL', remaining: 5 }]);
    expect(before.blocks[0].subject).toBe('BWL');
    expect(after.blocks[0].subject).toBe('CFA');
  });
});

describe('plan demands', () => {
  it('open hours per target and the nearest deadline or exam within a week', () => {
    const d = planDemands({ CFA: 6, BWL: 4, Recht: 0 }, { CFA: 2.5, BWL: 5 }, [{ subject: 'CFA', due: at(30, 12) }, { subject: 'CFA', due: at(24, 12) }], [{ subject: 'BWL', due: at(23, 9) }], now);
    expect(d).toEqual([
      { subject: 'CFA', remaining: 3.5, due: at(24, 12), dueLabel: 'deadline' },
      { subject: 'BWL', remaining: 0, due: at(23, 9), dueLabel: 'exam' },
    ]);
  });
});
