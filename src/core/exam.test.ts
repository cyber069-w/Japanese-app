import { describe, expect, it } from 'vitest';
import { examPlan, weakTopics } from './exam';
import type { CourseMeter } from './meter';

const now = new Date(2026, 9, 19).getTime();
const meter = (value: number, scores: number[]): CourseMeter => ({ value, parts: scores.map((score, i) => ({ label: `P${i}`, score, share: 1 / scores.length, total: 1, learned: 0, mastered: 0, selfRated: false, unverified: null })) });

describe('examPlan', () => {
  it('starts 6 weeks before the exam', () => {
    expect(examPlan('2026-12-15', meter(0.2, [0.2]), now)).toBeNull(); // 57 days
    expect(examPlan('2026-11-30', meter(0.2, [0.2]), now)?.weeksLeft).toBe(6); // 42 days
    expect(examPlan('2026-10-01', meter(0.2, [0.2]), now)).toBeNull(); // past
    expect(examPlan('', meter(0.2, [0.2]), now)).toBeNull();
  });
  it('lists weak parts and suggests hours', () => {
    const p = examPlan('2026-11-16', meter(0.5, [0.9, 0.3, 0.6]), now)!; // 28 days
    expect(p.open.map((o) => o.label)).toEqual(['P1', 'P2']);
    expect(p.weeklyHours).toBe(6); // 2 + 8 × 0.5
    expect(examPlan('2026-10-26', meter(0.5, [0.5]), now)!.weeklyHours).toBe(9); // 7 days: ×1.5
  });
});
describe('weakTopics', () => {
  it('groups mistakes by module, most first', () => {
    expect(weakTopics([{ moduleId: 'a' }, { moduleId: 'b' }, { moduleId: 'b' }], (id) => id.toUpperCase())).toEqual([{ name: 'B', n: 2 }, { name: 'A', n: 1 }]);
  });
});
