import { describe, expect, it } from 'vitest';
import { DAY, MINUTE, accuracy, gradeFromAnswer, review, weakness, type CardState } from './srs';

const T0 = Date.UTC(2026, 9, 10, 8, 0, 0);

function graduate(): CardState {
  let c = review(undefined, 'good', T0, 'x'); // step 0 → 1 (10 min)
  c = review(c, 'good', T0 + 10 * MINUTE); // graduate → 1 day
  return c;
}

describe('learning phase', () => {
  it('starts with short learning steps', () => {
    const c = review(undefined, 'good', T0, 'hiragana:read:ka');
    expect(c.id).toBe('hiragana:read:ka');
    expect(c.step).toBe(1);
    expect(c.due).toBe(T0 + 10 * MINUTE);
    expect(c.seen).toBe(1);
    expect(c.correct).toBe(1);
  });
  it('a wrong answer restarts the steps and comes back in a minute', () => {
    const c = review(undefined, 'again', T0, 'x');
    expect(c.step).toBe(0);
    expect(c.due).toBe(T0 + 1 * MINUTE);
    expect(c.correct).toBe(0);
    expect(c.lastWrong).toBe(T0);
  });
  it('graduates to one day after the last step', () => {
    const c = graduate();
    expect(c.step).toBe(-1);
    expect(c.interval).toBe(1);
    expect(c.due).toBe(T0 + 10 * MINUTE + DAY);
  });
  it('easy skips straight to four days', () => {
    const c = review(undefined, 'easy', T0, 'x');
    expect(c.step).toBe(-1);
    expect(c.interval).toBe(4);
  });
});

describe('review phase', () => {
  it('intervals grow with the ease factor', () => {
    let c = graduate();
    let t = c.due;
    c = review(c, 'good', t);
    expect(c.interval).toBe(3); // max(1+1, 1 × 2.5) rounded
    t = c.due;
    c = review(c, 'good', t);
    expect(c.interval).toBe(8); // 3 × 2.5 = 7.5 → 8
    expect(c.reps).toBe(3);
  });
  it('known items fade out: easy grows faster than good', () => {
    const g = review(graduate(), 'good', T0 + 2 * DAY);
    const e = review(graduate(), 'easy', T0 + 2 * DAY);
    expect(e.interval).toBeGreaterThan(g.interval);
    expect(e.ease).toBeGreaterThan(g.ease);
  });
  it('forgetting brings the card back soon and lowers the ease', () => {
    let c = graduate();
    c = review(c, 'good', c.due);
    c = review(c, 'good', c.due); // interval 8
    const before = c;
    c = review(c, 'again', c.due);
    expect(c.lapses).toBe(1);
    expect(c.ease).toBeCloseTo(before.ease - 0.2);
    expect(c.step).toBe(0);
    expect(c.due).toBe(before.due + 10 * MINUTE);
    expect(c.interval).toBe(4); // halved
    // after relearning it returns with the reduced interval, not from zero
    c = review(c, 'good', c.due);
    expect(c.step).toBe(-1);
    expect(c.interval).toBe(4);
  });
  it('ease never drops below 1.3', () => {
    let c = graduate();
    for (let i = 0; i < 20; i++) {
      c = review(c, 'again', c.due);
      c = review(c, 'good', c.due);
    }
    expect(c.ease).toBeGreaterThanOrEqual(1.3);
  });
  it('practising before the due date does not push the schedule', () => {
    const c = graduate();
    const early = review(c, 'good', c.due - 6 * 3_600_000);
    expect(early.due).toBe(c.due);
    expect(early.interval).toBe(c.interval);
    expect(early.seen).toBe(c.seen + 1);
  });
  it('but a mistake while practising early still counts', () => {
    const c = graduate();
    const early = review(c, 'again', c.due - 6 * 3_600_000);
    expect(early.lapses).toBe(1);
    expect(early.due).toBeLessThan(c.due);
  });
  it('does not mutate the input card', () => {
    const c = graduate();
    const copy = { ...c };
    review(c, 'again', c.due);
    expect(c).toEqual(copy);
  });
});

describe('helpers', () => {
  it('accuracy is smoothed', () => {
    expect(accuracy({ seen: 0, correct: 0 })).toBe(0.5);
    expect(accuracy({ seen: 8, correct: 8 })).toBe(0.9);
  });
  it('weak items score higher than strong ones', () => {
    let weak = review(undefined, 'again', T0, 'w');
    weak = review(weak, 'again', T0 + MINUTE);
    let strong = graduate();
    strong = review(strong, 'good', strong.due);
    expect(weakness(weak, T0 + 2 * MINUTE)).toBeGreaterThan(weakness(strong, T0 + 2 * MINUTE));
  });
  it('maps answers to grades', () => {
    expect(gradeFromAnswer(false)).toBe('again');
    expect(gradeFromAnswer(true, { hinted: true })).toBe('hard');
    expect(gradeFromAnswer(true, { ms: 900, fastMs: 2500 })).toBe('easy');
    expect(gradeFromAnswer(true, { ms: 4000, fastMs: 2500 })).toBe('good');
  });
});
