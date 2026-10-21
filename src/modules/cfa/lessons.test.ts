import { describe, expect, it } from 'vitest';
import { parseCfaLessons } from './lessons';

const good = {
  topic: 'quant', module: 2, title: 'Time value of money',
  terms: [{ term: 'PV', definition: 'Present value' }, { term: '', definition: 'x' }],
  formulas: [{ name: 'PV', formula: 'FV / (1+r)^n' }],
  questions: [{ q: 'Q?', options: ['a', 'b', 'c'], answer: 'B', explain: 'because' }, { q: 'bad', options: ['a'], answer: 0 }],
};

describe('parseCfaLessons', () => {
  it('reads a lesson (also inside a code fence), drops invalid parts and reports them', () => {
    const { lessons, errors } = parseCfaLessons('```json\n' + JSON.stringify(good) + '\n```');
    expect(lessons).toHaveLength(1);
    expect(lessons[0]).toMatchObject({ id: 'quant-2-time-value-of-money', topic: 'quant' });
    expect(lessons[0].terms).toHaveLength(1);
    expect(lessons[0].questions).toEqual([{ q: 'Q?', options: ['a', 'b', 'c'], answer: 1, explain: 'because' }]);
    expect(errors).toHaveLength(1);
  });
  it('reads the guided lesson and German term notes; drops broken steps', () => {
    const learn = {
      intro: 'Hi',
      words: [{ term: 'bond', definition: 'a loan', de: 'Anleihe' }],
      sections: [
        { title: 'One', text: 'A [[bond]].', check: { q: 'Q?', options: ['a', 'b', 'c'], answer: 2 } },
        { title: '', text: 'no title' },
        { title: 'Two', text: 'x', check: { q: 'bad', options: ['a'], answer: 0 } },
      ],
      summary: ['s', ''],
    };
    const [l] = parseCfaLessons(JSON.stringify({ ...good, terms: [{ term: 'PV', definition: 'Present value', de: 'Barwert' }], learn })).lessons;
    expect(l.terms[0].de).toBe('Barwert');
    expect(l.learn?.sections.map((s) => s.title)).toEqual(['One', 'Two']);
    expect(l.learn?.sections[0].check?.answer).toBe(2);
    expect(l.learn?.sections[1].check).toBeUndefined();
    expect(l.learn?.summary).toEqual(['s']);
    expect(l.learn?.words[0].de).toBe('Anleihe');
    expect(parseCfaLessons(JSON.stringify(good)).lessons[0].learn).toBeUndefined();
  });
  it('accepts arrays and rejects non-JSON', () => {
    expect(parseCfaLessons(JSON.stringify([good, good])).lessons).toHaveLength(2);
    expect(parseCfaLessons('hello').errors[0]).toContain('not valid JSON');
  });
});

