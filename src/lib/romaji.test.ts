import { describe, expect, it } from 'vitest';
import { kanaEquals, matchesReading, phraseRomaji, toHiragana, toKana, toKatakana, toRomaji } from './romaji';

describe('toRomaji (Hepburn)', () => {
  it('romanises the exceptions', () => {
    expect(toRomaji('し')).toBe('shi');
    expect(toRomaji('ち')).toBe('chi');
    expect(toRomaji('つ')).toBe('tsu');
    expect(toRomaji('ふ')).toBe('fu');
    expect(toRomaji('じ')).toBe('ji');
    expect(toRomaji('ぢ')).toBe('ji');
    expect(toRomaji('づ')).toBe('zu');
    expect(toRomaji('を')).toBe('wo');
  });
  it('handles combinations, small tsu and long vowels', () => {
    expect(toRomaji('きゃ')).toBe('kya');
    expect(toRomaji('しゅくだい')).toBe('shukudai');
    expect(toRomaji('がっこう')).toBe('gakkou');
    expect(toRomaji('まっちゃ')).toBe('matcha');
    expect(toRomaji('コーヒー')).toBe('koohii');
    expect(toRomaji('がっこう', { long: 'macron' })).toBe('gakkō');
    expect(toRomaji('きんえん')).toBe("kin'en");
    expect(toRomaji('こんにちは')).toBe('konnichiha');
  });
});

describe('toKana (IME)', () => {
  it('accepts all common spellings', () => {
    for (const r of ['shi', 'si']) expect(toKana(r)).toBe('し');
    for (const r of ['chi', 'ti']) expect(toKana(r)).toBe('ち');
    for (const r of ['tsu', 'tu']) expect(toKana(r)).toBe('つ');
    for (const r of ['fu', 'hu']) expect(toKana(r)).toBe('ふ');
    for (const r of ['ji', 'zi']) expect(toKana(r)).toBe('じ');
    for (const r of ['sha', 'sya']) expect(toKana(r)).toBe('しゃ');
    for (const r of ['ja', 'jya', 'zya']) expect(toKana(r)).toBe('じゃ');
    for (const r of ['cha', 'tya', 'cya']) expect(toKana(r)).toBe('ちゃ');
  });
  it('handles n, double consonants and long vowel marks', () => {
    expect(toKana('konnichiwa')).toBe('こんにちわ');
    expect(toKana('konna')).toBe('こんな');
    expect(toKana("kin'en")).toBe('きんえん');
    expect(toKana('hon')).toBe('ほん');
    expect(toKana('gakkou')).toBe('がっこう');
    expect(toKana('matcha')).toBe('まっちゃ');
    expect(toKana('ko-hi-', { katakana: true })).toBe('コーヒー');
    expect(toKana('terebi', { katakana: true })).toBe('テレビ');
  });
  it('keeps partial syllables while typing', () => {
    expect(toKana('nek', { final: false })).toBe('ねk');
    expect(toKana('hon', { final: false })).toBe('ほn');
    expect(toKana('ねko', { final: false })).toBe('ねこ');
  });
  it('converts scripts', () => {
    expect(toKatakana('ねこ')).toBe('ネコ');
    expect(toHiragana('テレビ')).toBe('てれび');
  });
});

describe('matchesReading', () => {
  it('accepts Hepburn and variants in normal mode', () => {
    expect(matchesReading('shi', 'し')).toBe(true);
    expect(matchesReading('si', 'し')).toBe(true);
    expect(matchesReading('ti', 'ち')).toBe(true);
    expect(matchesReading('tu', 'つ')).toBe(true);
    expect(matchesReading('hu', 'ふ')).toBe(true);
    expect(matchesReading('zi', 'じ')).toBe(true);
    expect(matchesReading('du', 'づ')).toBe(true);
    expect(matchesReading('zu', 'づ')).toBe(true);
    expect(matchesReading('o', 'を')).toBe(true);
    expect(matchesReading('wo', 'を')).toBe(true);
    expect(matchesReading('n', 'ん')).toBe(true);
    expect(matchesReading('  KA ', 'か')).toBe(true);
  });
  it('rejects wrong readings', () => {
    expect(matchesReading('sa', 'し')).toBe(false);
    expect(matchesReading('ki', 'き'.concat('ゃ'))).toBe(false);
    expect(matchesReading('', 'か')).toBe(false);
    expect(matchesReading('nu', 'ね')).toBe(false);
  });
  it('handles long vowels', () => {
    expect(matchesReading('gakkou', 'がっこう')).toBe(true);
    expect(matchesReading('gakkō', 'がっこう')).toBe(true);
    expect(matchesReading('gakkoo', 'がっこう')).toBe(true);
    expect(matchesReading('gakko', 'がっこう')).toBe(false);
    expect(matchesReading('gakko', 'がっこう', 'lenient')).toBe(true);
    expect(matchesReading('kōhī', 'コーヒー')).toBe(true);
    expect(matchesReading('koohii', 'コーヒー')).toBe(true);
    expect(matchesReading('sensee', 'せんせい')).toBe(true);
  });
  it('strict mode only accepts Hepburn', () => {
    expect(matchesReading('shi', 'し', 'strict')).toBe(true);
    expect(matchesReading('si', 'し', 'strict')).toBe(false);
    expect(matchesReading('tu', 'つ', 'strict')).toBe(false);
    expect(matchesReading('gakkou', 'がっこう', 'strict')).toBe(true);
    expect(matchesReading('gakkō', 'がっこう', 'strict')).toBe(true);
    expect(matchesReading('kōhī', 'コーヒー', 'strict')).toBe(true);
  });
  it('accepts extra spellings (particles)', () => {
    expect(matchesReading('konnichiwa', 'こんにちは')).toBe(false);
    expect(matchesReading('konnichiwa', 'こんにちは', 'normal', ['konnichiwa'])).toBe(true);
  });
  it('accepts kana typed with a Japanese keyboard', () => {
    expect(matchesReading('ねこ', 'ねこ')).toBe(true);
    expect(matchesReading('ネコ', 'ねこ')).toBe(true);
  });
});

describe('kanaEquals', () => {
  it('compares kana answers', () => {
    expect(kanaEquals('てれび', 'テレビ')).toBe(true);
    expect(kanaEquals('こーひー', 'コーヒー')).toBe(true);
    expect(kanaEquals('こおひい', 'コーヒー')).toBe(true);
    expect(kanaEquals('neko', 'ねこ')).toBe(true);
    expect(kanaEquals('ねこ', 'いぬ')).toBe(false);
    expect(kanaEquals('', 'いぬ')).toBe(false);
  });
});

describe('phraseRomaji', () => {
  it('writes particles as they are said', () => {
    expect(phraseRomaji('こんばんは。')).toBe('konbanwa');
    expect(phraseRomaji('こんにちは')).toBe('konnichiwa');
    expect(phraseRomaji('では また')).toBe('dewa mata');
    expect(phraseRomaji('わたしは がくせい です。')).toBe('watashi wa gakusei desu');
    expect(phraseRomaji('にほんへ いきます')).toBe('nihon e ikimasu');
    expect(phraseRomaji('ほんを よみます')).toBe('hon o yomimasu');
  });
  it('leaves words alone', () => {
    expect(phraseRomaji('はは')).toBe('haha');
    expect(phraseRomaji('がっこう')).toBe('gakkou');
  });
});
