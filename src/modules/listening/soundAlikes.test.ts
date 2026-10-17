import { describe, expect, it } from 'vitest';
import { pickAlikes, soundAlikes } from './soundAlikes';

const kanaOf = (w: string) => soundAlikes(w).map((a) => a.kana);

describe('soundAlikes', () => {
  it('toggles long vowels', () => {
    expect(kanaOf('おばあさん')).toContain('おばさん');
    expect(kanaOf('おばさん')).toContain('おばあさん');
    expect(kanaOf('ビル')).toContain('ビール');
    expect(kanaOf('ビール')).toContain('ビル');
    expect(kanaOf('せんせい')).toContain('せんせ');
    expect(kanaOf('かわいい')).toContain('かわい');
  });

  it('toggles small っ', () => {
    expect(kanaOf('きって')).toContain('きて');
    expect(kanaOf('きて')).toContain('きって');
    expect(kanaOf('ねこ')).toContain('ねっこ');
  });

  it('toggles dakuten, small ゃゅょ and ん', () => {
    expect(kanaOf('かき')).toContain('かぎ');
    expect(kanaOf('てんき')).toContain('でんき');
    expect(kanaOf('きょう')).toContain('きよう');
    expect(kanaOf('びよういん')).toContain('びょういん');
    expect(kanaOf('こんな')).toContain('こな');
  });

  it('keeps katakana words in katakana and never returns the word itself', () => {
    for (const w of ['コーヒー', 'テレビ', 'パン', 'ねこ', 'がっこう', 'しゃしん']) {
      const all = kanaOf(w);
      expect(all).not.toContain(w);
      expect(new Set(all).size).toBe(all.length);
      if (/[ァ-ヺ]/.test(w)) all.forEach((a) => expect(a).toMatch(/^[ァ-ヺー]+$/));
    }
  });

  it('lengthens vowel kana too (いえ ↔ いいえ) but not twice', () => {
    expect(kanaOf('いえ')).toContain('いいえ');
    expect(kanaOf('いいえ')).toContain('いえ');
    expect(kanaOf('いいえ')).not.toContain('いいいえ');
  });

  it('picks varied contrasts', () => {
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const picked = pickAlikes('がっこう', 3, rng);
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((p) => p.kind)).size).toBeGreaterThan(1);
  });
});
