import { describe, expect, it } from 'vitest';
import type { Profile } from '../../core/types';
import { parseSentence } from '../grammar/sentence';
import { EMPTY_PROFILE, introLines, isComplete, resolve } from './intro';
import { QUESTIONS } from './questions';
import { COUNTRIES, HOBBIES, MAJORS } from './data';

const me: Profile = {
  ...EMPTY_PROFILE,
  name: 'Maximilian', nameJa: '', country: 'ch', university: 'St. Gallen', universityJa: '',
  year: '2', major: 'econ', age: 20, birthday: '04-14', hobbies: ['ski', 'reading'],
};

/** Parsed text must not contain leftover notation characters. */
const clean = (notation: string) => {
  const s = parseSentence(notation);
  expect(s.text).not.toMatch(/[[\]{}]/);
  expect(s.reading).not.toMatch(/[[\]{}]/);
  return s;
};

describe('self-introduction', () => {
  it('builds the introduction from the form', () => {
    const lines = introLines(me);
    expect(lines.map((l) => l.id)).toEqual(['greet', 'name', 'age', 'country', 'uni', 'major', 'hobby', 'close']);
    const text = lines.map((l) => clean(l.ja).text);
    expect(text).toContain('私はマクシミリアンです。');
    expect(text).toContain('20歳です。');
    expect(text).toContain('スイスから来ました。');
    expect(text).toContain('ザンクト・ガレン大学の2年生です。');
    expect(text).toContain('専攻は経済学です。');
    expect(text).toContain('趣味はスキーと読書です。');
    expect(clean(lines[2].ja).reading).toBe('はたちです。');
    expect(lines.find((l) => l.id === 'country')!.de).toBe('Ich komme aus der Schweiz.');
    expect(lines.find((l) => l.id === 'hobby')!.de).toBe('Meine Hobbys sind Skifahren und Lesen.');
  });

  it('leaves out what is not filled in', () => {
    const lines = introLines({ ...EMPTY_PROFILE, name: 'Anna', country: 'de' });
    expect(lines.map((l) => l.id)).toEqual(['greet', 'name', 'country', 'close']);
    expect(isComplete({ ...EMPTY_PROFILE, name: 'Anna', country: 'de' })).toBe(false);
    expect(isComplete(me)).toBe(true);
  });

  it('uses the hand-edited Japanese and adds 大学 once', () => {
    const r = resolve({ ...me, nameJa: 'マックス', universityJa: 'ザンクトガレン大学' });
    expect(r.name.ja).toBe('マックス');
    expect(clean(r.uni.ja).text).toBe('ザンクトガレン大学');
    expect(r.uni.latin).toBe('St. Gallen');
  });

  it('ignores impossible values from old backups', () => {
    const r = resolve({ ...me, age: 0, birthday: '02-00', hobbies: ['nope'] });
    expect(r.missing.has('age')).toBe(true);
    expect(r.missing.has('birthday')).toBe(true);
    expect(r.missing.has('hobbies')).toBe(true);
    expect(introLines({ ...me, age: 0, hobbies: ['nope'] }).map((l) => l.id)).not.toContain('age');
    expect(introLines({ ...me, hobbies: ['nope'] }).map((l) => l.id)).not.toContain('hobby');
  });

  it('marks fields that come from the example profile', () => {
    const r = resolve(null);
    expect(r.missing.has('name')).toBe(true);
    expect(resolve(me).missing.size).toBe(0);
  });
});

describe('oral exam questions', () => {
  const now = new Date(2026, 9, 11, 14, 5);
  it.each(QUESTIONS.map((q) => [q.id, q] as const))('%s has well-formed model answers', (_id, q) => {
    clean(q.q);
    for (const profile of [null, me]) {
      const answers = q.answers(resolve(profile), now);
      expect(answers.length).toBeGreaterThan(0);
      for (const a of answers) {
        clean(a.ja);
        expect(a.de.length).toBeGreaterThan(1);
        expect(a.en.length).toBeGreaterThan(1);
      }
    }
  });

  it('answers time questions with the real clock', () => {
    const r = resolve(me);
    const time = QUESTIONS.find((q) => q.id === 'now')!.answers(r, now)[0];
    expect(clean(time.ja).text).toBe('午後2時5分です。');
    expect(clean(time.ja).reading).toBe('ごごにじごふんです。');
    const date = QUESTIONS.find((q) => q.id === 'date')!.answers(r, now)[0];
    expect(clean(date.ja).reading).toBe('じゅうがつじゅういちにちです。');
    const day = QUESTIONS.find((q) => q.id === 'weekday')!.answers(r, now)[0];
    expect(clean(day.ja).text).toBe('日曜日です。');
  });

  it('personalises answers from the profile', () => {
    const r = resolve(me);
    const bday = QUESTIONS.find((q) => q.id === 'birthday')!.answers(r, now)[0];
    expect(clean(bday.ja).reading).toBe('しがつじゅうよっかです。');
    const sport = QUESTIONS.find((q) => q.id === 'sport')!.answers(r, now)[0];
    expect(clean(sport.ja).text).toBe('スキーが好きです。');
    const langs = QUESTIONS.find((q) => q.id === 'languages')!.answers(r, now)[0];
    expect(langs.de).toContain('Deutsch und Englisch');
  });
});

describe('form data', () => {
  it('has unique ids and parseable Japanese', () => {
    for (const list of [COUNTRIES, MAJORS, HOBBIES]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
      list.forEach((x) => clean(x.ja));
    }
    HOBBIES.forEach((h) => clean(h.act.ja));
  });
});
