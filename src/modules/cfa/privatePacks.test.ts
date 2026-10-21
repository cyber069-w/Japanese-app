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
});
