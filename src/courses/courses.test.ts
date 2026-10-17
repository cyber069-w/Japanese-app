import { describe, expect, it } from 'vitest';
import { MODULES } from '../modules';
import { ACTIVE_IDS, COURSES, courseEntries, courseModules, getCourse, isUnverified, meterSections, moduleInfo } from '.';

describe('course registry', () => {
  it('loads every course folder, in order', () => {
    expect(COURSES.map((c) => c.id)).toEqual(['japanese', 'cfa', 'bwl', 'recht']);
    for (const c of COURSES) {
      expect(c.claudeProjectUrl).toBe('');
      expect(c.glyph.length).toBeGreaterThan(0);
    }
  });

  it('places every module in exactly one course, and only existing modules', () => {
    const listed = COURSES.flatMap((c) => courseEntries(c).map((e) => e.id));
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual(MODULES.map((m) => m.id).sort());
  });

  it('marks unverified exercises that exist', () => {
    for (const m of MODULES) {
      const u = moduleInfo(m.id).unverified;
      if (Array.isArray(u)) for (const ex of u) expect(m.exercises.map((e) => e.id)).toContain(ex);
    }
    expect(isUnverified('grammar')).toBe(true);
    expect(isUnverified('hiragana')).toBe(false);
    expect(isUnverified('hiragana', 'words')).toBe(true);
    expect(isUnverified('vocab', 'meaning')).toBe(false);
  });

  it('keeps kanji as "coming later": not studied, never due', () => {
    expect(moduleInfo('kanji').soon).toBe(true);
    expect(ACTIVE_IDS).not.toContain('kanji');
    expect(courseModules(getCourse('japanese')).map((m) => m.id)).toEqual(['hiragana', 'katakana', 'vocab', 'grammar', 'numbers', 'listening', 'speaking']);
  });

  it('builds the meter from existing modules', () => {
    const jp = meterSections(getCourse('japanese'));
    expect(jp.reduce((s, x) => s + x.weight, 0)).toBe(100);
    const ids = courseModules(getCourse('japanese')).map((m) => m.id);
    for (const s of jp) for (const m of s.modules) expect(ids).toContain(m);
  });

  it('has the CFA 2027 topics with 102 learning modules', () => {
    const cfa = getCourse('cfa');
    expect(cfa.topics).toHaveLength(10);
    expect(cfa.topics!.reduce((s, t) => s + t.modules, 0)).toBe(102);
    expect(meterSections(cfa).map((s) => s.weight)).toEqual([12.5, 7.5, 7.5, 12.5, 12.5, 12.5, 7.5, 7.5, 10, 12.5]);
  });

  it('falls back to the first course for unknown ids', () => {
    expect(getCourse('nope').id).toBe('japanese');
    expect(getCourse(undefined).id).toBe('japanese');
  });
});
