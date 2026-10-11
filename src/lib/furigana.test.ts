import { describe, expect, it } from 'vitest';
import { alignRuby, parseRubyNotation, rubyBase, rubyReading } from './furigana';

describe('alignRuby', () => {
  it('puts furigana only on the kanji', () => {
    expect(alignRuby('起きます', 'おきます')).toEqual([['起', 'お'], ['きます']]);
    expect(alignRuby('会社員', 'かいしゃいん')).toEqual([['会社員', 'かいしゃいん']]);
    expect(alignRuby('お名前は？', 'おなまえは？')).toEqual([['お'], ['名前', 'なまえ'], ['は？']]);
    expect(alignRuby('～から来ました。', '～から きました。'.replace(' ', ''))).toEqual([['～から'], ['来', 'き'], ['ました。']]);
  });
  it('handles kana-only words and mismatches', () => {
    expect(alignRuby('', 'ねこ')).toEqual([['ねこ']]);
    expect(alignRuby('CD', 'シーディー')).toEqual([['CD', 'シーディー']]);
  });
});

describe('parseRubyNotation', () => {
  it('parses the grammar sentence format', () => {
    const r = parseRubyNotation('私[わたし]は 学生[がくせい]です。');
    expect(r).toEqual([['私', 'わたし'], ['は'], ['学生', 'がくせい'], ['です。']]);
    expect(rubyBase(r)).toBe('私は学生です。');
    expect(rubyReading(r)).toBe('わたしはがくせいです。');
  });
});
