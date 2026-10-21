import { describe, expect, it } from 'vitest';
import { parseCfaLessons } from './lessons';
import { mergeShipped, upToDate } from './lessonPacks';
import { findQuote } from './annotate';
import { wordsIn } from './Explain';

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
    const withDe = { ...learn, de: { intro: 'Hallo', summary: ['z', ''] }, sections: [{ ...learn.sections[0], de: { text: 'Eine [[bond]].', check: { q: 'F?', options: ['a', 'b', 'c'], answer: 2 } } }] };
    const [d] = parseCfaLessons(JSON.stringify({ ...good, learn: withDe })).lessons;
    expect(d.learn?.de).toEqual({ intro: 'Hallo', summary: ['z'] });
    expect(d.learn?.sections[0].de).toMatchObject({ text: 'Eine [[bond]].', check: { q: 'F?', answer: 2 } });
    expect(d.learn?.sections[0].de?.title).toBeUndefined();
  });
  it('accepts arrays and rejects non-JSON', () => {
    expect(parseCfaLessons(JSON.stringify([good, good])).lessons).toHaveLength(2);
    expect(parseCfaLessons('hello').errors[0]).toContain('not valid JSON');
  });
});


describe('mergeShipped', () => {
  it('replaces stored lessons with the same topic + module or id, keeps the rest', () => {
    const [a] = parseCfaLessons(JSON.stringify({ ...good, module: 1, title: 'Old title' })).lessons;
    const [b] = parseCfaLessons(JSON.stringify({ ...good, topic: 'economics', module: 1, title: 'Own import' })).lessons;
    const [c] = parseCfaLessons(JSON.stringify({ ...good, module: 1, title: 'New title' })).lessons;
    expect(mergeShipped([a, b], [c]).map((l) => l.title)).toEqual(['Own import', 'New title']);
  });
});

describe('upToDate', () => {
  it('spots a missing, changed or duplicated shipped lesson', () => {
    const [s] = parseCfaLessons(JSON.stringify({ ...good, module: 1, title: 'Shipped' })).lessons;
    const [old] = parseCfaLessons(JSON.stringify({ ...good, module: 1, title: 'Old copy' })).lessons;
    expect(upToDate([s], [s])).toBe(true);
    expect(upToDate([], [s])).toBe(false);
    expect(upToDate([{ ...s, title: 'changed' }], [s])).toBe(false);
    expect(upToDate([old, s], [s])).toBe(false);
  });
});

describe('findQuote', () => {
  it('finds a quote across text items, ignoring spaces and case', () => {
    const items = [{ str: 'The holding period ' }, { str: 'return is the gain' }, { str: 'over one period.' }];
    expect(findQuote(items, 'Holding Period Return')).toEqual([{ item: 0, from: 4, to: 18 }, { item: 1, from: 0, to: 6 }]);
    expect(findQuote(items, 'gainover')).toEqual([{ item: 1, from: 14, to: 18 }, { item: 2, from: 0, to: 4 }]);
    expect(findQuote(items, 'not there')).toEqual([]);
  });
});

describe('wordsIn', () => {
  it('finds lesson words in marked text (also the short form in brackets and plurals)', () => {
    const words = [
      { term: 'Holding period return (HPR)', definition: 'x' },
      { term: 'dividend', definition: 'y' },
      { term: 'index', definition: 'z' },
    ];
    expect(wordsIn('A stock paying a $2 dividend earns HPR = 10%', words).map((w) => w.term)).toEqual(['Holding period return (HPR)', 'dividend']);
    expect(wordsIn('The holding period return is the gain', words)).toHaveLength(1);
    expect(wordsIn('two dividends', words)[0].term).toBe('dividend');
    expect(wordsIn('indexation', words)).toEqual([]);
  });
});
