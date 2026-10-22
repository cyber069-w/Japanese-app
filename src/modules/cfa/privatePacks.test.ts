/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCfaLessons } from './lessons';

// Validates the private study packs in private/cfa/packs (git-ignored; skipped when the folder isn't on this machine).
const file = 'private/cfa/packs/quant-all.json';
describe.skipIf(!existsSync(file))('private CFA packs', () => {
  it('quant-all.json imports without a single skipped item', () => {
    const r = parseCfaLessons(readFileSync(file, 'utf8'));
    expect(r.errors).toEqual([]);
    expect(r.lessons).toHaveLength(12);
    for (const l of r.lessons) {
      expect(l.terms.length).toBeGreaterThanOrEqual(8);
      expect(l.questions.length).toBeGreaterThanOrEqual(9);
      expect(l.formulas.length).toBeGreaterThan(0);
      expect((l.examples ?? []).length).toBeGreaterThanOrEqual(2);
      for (const q of l.questions) {
        expect(q.options).toHaveLength(3);
        expect(new Set(q.options).size).toBe(3);
      }
    }
    // the answers must not all sit in the same position
    const positions = r.lessons.flatMap((l) => l.questions.map((q) => q.answer));
    expect(new Set(positions).size).toBeGreaterThan(1);
  });
  it('every [[word]] in a guided lesson has a definition', () => {
    const lessons = parseCfaLessons(readFileSync(file, 'utf8')).lessons;
    expect(lessons.filter((l) => !l.learn).map((l) => l.title)).toEqual([]);
    for (const l of lessons) {
      if (!l.learn) continue;
      const known = new Set([...l.terms, ...l.learn.words].map((t) => t.term.toLowerCase()));
      const parts = (s: { text?: string; example?: string; remember?: string; trap?: string } = {}) => [s.text ?? '', s.example ?? '', s.remember ?? '', s.trap ?? ''];
      const texts = [l.learn.intro, ...l.learn.summary, l.learn.de?.intro ?? '', ...(l.learn.de?.summary ?? []), ...l.learn.sections.flatMap((s) => [...parts(s), ...parts(s.de)])];
      const missing = texts.flatMap((t) => [...t.matchAll(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g)].map((m) => (m[2] ?? m[1]).trim())).filter((w) => !known.has(w.toLowerCase()));
      expect(missing, l.title).toEqual([]);
      expect(l.learn.sections.every((s) => s.check), l.title).toBe(true);
    }
  });
  it('every term has a plain-language meaning for the New words box', () => {
    const lessons = parseCfaLessons(readFileSync(file, 'utf8')).lessons;
    expect(lessons.flatMap((l) => l.terms.filter((t) => !t.plain).map((t) => `${l.title}: ${t.term}`))).toEqual([]);
  });
});
