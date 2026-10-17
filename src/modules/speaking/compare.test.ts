import { describe, expect, it } from 'vitest';
import { parseSentence } from '../grammar/sentence';
import { bestMatch, compareSpoken } from './compare';

const s = parseSentence('私[わたし]{は} 学生[がくせい]です。');

describe('compareSpoken', () => {
  it('accepts kanji, kana or katakana for each word', () => {
    expect(compareSpoken(s, '私は学生です').score).toBe(1);
    expect(compareSpoken(s, 'わたしわがくせいです').score).toBe(1);
  });
  it('marks missing words', () => {
    const r = compareSpoken(s, '学生です');
    expect(r.words.map((w) => [w.romaji, w.ok])).toEqual([['watashi wa', false], ['gakusei desu', true]]);
    expect(r.score).toBe(0.5);
  });
  it('picks the best alternative', () => {
    expect(bestMatch(s, ['渡し橋', '私は学生です']).heard).toBe('私は学生です');
  });
});
