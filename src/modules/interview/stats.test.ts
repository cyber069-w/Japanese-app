import { describe, expect, it } from 'vitest';
import { gradeOfRating, speechStats, warmupDone, warmupPick, warmupStreak, type Attempt } from './stats';

describe('speech stats', () => {
  it('counts words, wpm and fillers', () => {
    const s = speechStats('Um so I think, like, basically the margin uh grows', 30);
    expect(s.words).toBe(10);
    expect(s.wpm).toBe(20);
    expect(s.byWord).toEqual({ um: 1, uh: 1, like: 1, basically: 1 });
    expect(s.fillers).toBe(4);
    expect(s.fillersPerMin).toBe(8);
  });
  it('"also" is a filler only in German; äh/ähm counted', () => {
    expect(speechStats('We also grow', 10, 'en').fillers).toBe(0);
    expect(speechStats('Also ähm wir wachsen äh', 10, 'de').byWord).toEqual({ ähm: 2, also: 1 });
  });
  it('an empty transcript is zero, not NaN', () => {
    expect(speechStats('', 0)).toMatchObject({ words: 0, wpm: 0, fillersPerMin: 0 });
  });
});
describe('warm-up', () => {
  const at = (d: number, h = 9) => new Date(2026, 9, d, h).getTime();
  const a = (d: number, warmup = true): Attempt => ({ id: `${d}`, qid: 'q', at: at(d), seconds: 60, target: 60, transcript: '', words: 0, wpm: 0, fillers: 0, fillersPerMin: 0, rating: 3, warmup, lang: 'en' });
  it('streak counts consecutive days and survives until today is done', () => {
    expect(warmupStreak([a(17), a(18), a(19)], at(19, 20))).toBe(3);
    expect(warmupStreak([a(17), a(18)], at(19, 8))).toBe(2);
    expect(warmupStreak([a(15), a(18, false)], at(19, 8))).toBe(0);
    expect(warmupDone([a(19)], at(19, 22))).toBe(true);
  });
  it('picks the same question all day', () => {
    const qs = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
    expect(warmupPick(qs, at(19, 7))).toEqual(warmupPick([...qs].reverse(), at(19, 23)));
    expect(warmupPick([], at(19))).toBeNull();
  });
  it('maps 1–5 to SRS grades', () => {
    expect([1, 2, 3, 4, 5].map(gradeOfRating)).toEqual(['again', 'again', 'hard', 'good', 'easy']);
  });
});
