import { describe, expect, it } from 'vitest';
import { buildVocabItem, vocabAccepts } from './items';

const entry = (kana: string, kanji = '', lesson = 1) => ({ id: 'x', kana, kanji: kanji || undefined, de: 'd', en: 'e', lesson, source: 't' });

describe('buildVocabItem', () => {
  it('handles alternatives in brackets', () => {
    const it = buildVocabItem(entry('だれ (どなた)', '誰 (どなた)'));
    expect(it.kana).toBe('だれ');
    expect(it.alt).toBe('どなた');
    expect(it.answers).toEqual(['だれ', 'どなた']);
    expect(it.ruby).toEqual([['誰', 'だれ']]);
  });
  it('expands optional parts', () => {
    const it = buildVocabItem(entry('[お]みやげ', '[お]土産'));
    expect(it.kana).toBe('おみやげ');
    expect(it.answers).toEqual(['おみやげ', 'みやげ']);
    expect(it.ruby).toEqual([['お'], ['土産', 'みやげ']]);
    const phrase = buildVocabItem(entry('[どうぞ] よろしく [おねがいします]。'));
    expect(phrase.answers).toContain('どうぞよろしくおねがいします');
    expect(phrase.answers).toContain('よろしく');
  });
  it('aligns furigana with okurigana', () => {
    expect(buildVocabItem(entry('おきます', '起きます')).ruby).toEqual([['起', 'お'], ['きます']]);
    expect(buildVocabItem(entry('あの ひと (あの かた)', 'あの人 (あの方)')).ruby).toEqual([['あの'], ['人', 'ひと']]);
  });
});

describe('vocabAccepts', () => {
  it('accepts kana in any script and alternatives', () => {
    expect(vocabAccepts('どなた', buildVocabItem(entry('だれ (どなた)')))).toBe(true);
    expect(vocabAccepts('てれび', buildVocabItem(entry('テレビ')))).toBe(true);
    expect(vocabAccepts('ねこ', buildVocabItem(entry('いぬ')))).toBe(false);
  });
  it('accepts particles written as pronounced in phrases only', () => {
    expect(vocabAccepts('こんにちわ', buildVocabItem(entry('こんにちは。')))).toBe(true);
    expect(vocabAccepts('わな', buildVocabItem(entry('はな')))).toBe(false);
  });
});
