import { describe, expect, it } from 'vitest';
import { parseCsv, parseVocabCsv } from './csv';

describe('parseCsv', () => {
  it('handles quotes and commas inside fields', () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n')).toEqual([['a', 'b'], ['x, y', 'say "hi"']]);
  });
  it('detects semicolons (German Excel) and tabs', () => {
    expect(parseCsv('kana;de\nねこ;Katze')).toEqual([['kana', 'de'], ['ねこ', 'Katze']]);
    expect(parseCsv('kana\tde\r\nいぬ\tHund\r\n')).toEqual([['kana', 'de'], ['いぬ', 'Hund']]);
  });
});

describe('parseVocabCsv', () => {
  it('reads the documented format', () => {
    const csv = 'kana,kanji,de,en,lesson\nがくせい,学生,Student,student,1\nほん,本,Buch,book,2';
    const { entries, errors } = parseVocabCsv(csv, 'test');
    expect(errors).toEqual([]);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ kana: 'がくせい', kanji: '学生', de: 'Student', en: 'student', lesson: 1, source: 'test' });
  });
  it('maps a plain meaning column to the chosen language', () => {
    const { entries } = parseVocabCsv('kana,meaning,lesson\nねこ,cat,1', 'x', 'en');
    expect(entries[0].en).toBe('cat');
    expect(entries[0].de).toBe('cat');
  });
  it('reports missing columns and bad lines', () => {
    expect(parseVocabCsv('foo,bar\n1,2', 'x').errors.length).toBeGreaterThan(0);
    const { entries, errors } = parseVocabCsv('kana,de\nねこ,Katze\n,Hund', 'x');
    expect(entries).toHaveLength(1);
    expect(errors[0]).toContain('Line 3');
  });
  it('converts a romaji column to kana, capitals to katakana', () => {
    const { entries } = parseVocabCsv('romaji,de,lesson\ngakusei,Student,1\nItaria,Italien,3\nginkōin,Bankangestellter,1\nkōhii,Kaffee,2\nKōhii,Kaffee,2', 'x');
    expect(entries.map((e) => e.kana)).toEqual(['がくせい', 'イタリア', 'ぎんこういん', 'こうひい', 'コーヒー']);
  });
  it('reads a headerless two-column Quizlet export (romaji ⇥ German)', () => {
    const { entries, errors } = parseVocabCsv('gakusei\tStudent/in\nKOOHII\tKaffee\nkin\'en\tRauchverbot', 'q');
    expect(errors).toEqual([]);
    expect(entries.map((e) => [e.kana, e.de])).toEqual([['がくせい', 'Student/in'], ['コーヒー', 'Kaffee'], ['きんえん', 'Rauchverbot']]);
  });
});
