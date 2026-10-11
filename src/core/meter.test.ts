import { describe, expect, it } from 'vitest';
import { cardScore, courseMeter, meterExercises, scoreModules } from './meter';
import { newCard, type CardState } from './srs';
import type { StudyContext, StudyModule } from './types';
import { getCourse } from '../courses';
import { getModule } from '../modules';

const card = (patch: Partial<CardState>): CardState => ({ ...newCard('m:e:i', 0), ...patch });
const ctx: StudyContext = { settings: {} as StudyContext['settings'], content: { vocab: [], hints: {}, kanjiList: [], profile: null }, rng: Math.random };

describe('cardScore', () => {
  it('counts nothing until a card has been answered right on two different days', () => {
    expect(cardScore(undefined)).toBe(0);
    expect(cardScore(card({ step: 1 }))).toBe(0); // still learning
    expect(cardScore(card({ step: -1, reps: 1, interval: 4 }))).toBe(0); // one lucky fast answer
    expect(cardScore(card({ step: -1, reps: 2, interval: 3 }))).toBe(0.5);
    expect(cardScore(card({ step: -1, reps: 4, interval: 21 }))).toBe(1);
    expect(cardScore(card({ step: 0, reps: 0, interval: 30, lapses: 1 }))).toBe(0); // being relearned
  });
});

const mod: StudyModule = {
  id: 'm', name: 'M', nameJa: '', icon: '', description: '', status: 'ready',
  exercises: [
    { id: 'quiz', name: '', description: '', icon: '', items: () => [{ id: 'a', label: 'a', groups: [] }, { id: 'b', label: 'b', groups: [] }], question: () => ({}) as never },
    { id: 'cards', name: '', description: '', icon: '', selfRated: true, items: () => [{ id: 'a', label: 'a', groups: [] }], question: () => ({}) as never },
    { id: 'gen', name: '', description: '', icon: '', generative: true, items: () => [{ id: 'x', label: 'x', groups: [] }], question: () => ({}) as never },
  ],
};

describe('scoreModules', () => {
  it('leaves out self-rated and generated exercises', () => {
    expect(meterExercises(mod).exercises.map((e) => e.id)).toEqual(['quiz']);
    const s = scoreModules([mod], ctx, {
      'm:quiz:a': card({ step: -1, reps: 5, interval: 30 }),
      'm:cards:a': card({ step: -1, reps: 5, interval: 30 }),
    });
    expect(s).toMatchObject({ total: 2, learned: 1, mastered: 1, score: 0.5, selfRated: false });
  });

  it('uses self-rated exercises when a module has nothing else (speaking)', () => {
    const speaking = getModule('speaking')!;
    expect(meterExercises(speaking).selfRated).toBe(true);
  });
});

describe('courseMeter', () => {
  it('is 0 for a course without content and lists every topic', () => {
    const m = courseMeter(getCourse('cfa'), ctx, {});
    expect(m.value).toBe(0);
    expect(m.parts).toHaveLength(10);
    expect(m.parts.every((p) => p.total === 0)).toBe(true);
    expect(m.parts.reduce((s, p) => s + p.share, 0)).toBeCloseTo(1);
  });

  it('weights Japanese sections and flags unverified ones', () => {
    const m = courseMeter(getCourse('japanese'), ctx, {});
    expect(m.parts.map((p) => [p.label, p.unverified])).toEqual([
      ['Alphabets', 'partly'],
      ['Vocabulary', null],
      ['Grammar', 'yes'],
      ['Listening', 'partly'],
      ['Speaking', 'yes'],
    ]);
    expect(m.parts.find((p) => p.label === 'Alphabets')!.total).toBeGreaterThan(0);
  });
});
