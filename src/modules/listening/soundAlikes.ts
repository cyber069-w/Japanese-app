/**
 * Near-miss spellings of a word for the "Hear the difference" drill –
 * the contrasts beginners mishear most:
 *
 *   long vowels   ビル ↔ ビール, おばさん ↔ おばあさん, ここ ↔ こうこう
 *   small っ      きて ↔ きって, ねこ ↔ ねっこ
 *   ゛ dakuten     かき ↔ かぎ, てんき ↔ でんき
 *   small ゃゅょ   きよう ↔ きょう, びよういん ↔ びょういん
 *   ん            こな ↔ こんな
 *
 * Every variant sounds different from the original (no おう ↔ おお style pairs).
 */
import { toHiragana, toKatakana, toRomaji } from '../../lib/romaji';

export type AlikeKind = 'long' | 'sokuon' | 'voicing' | 'small' | 'n';
export interface Alike { kana: string; kind: AlikeKind }

const VOICE: Record<string, string> = {
  か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ',
  た: 'だ', ち: 'じ', つ: 'ず', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ',
};
const UNVOICE: Record<string, string> = {
  が: 'か', ぎ: 'き', ぐ: 'く', げ: 'け', ご: 'こ', ざ: 'さ', じ: 'し', ず: 'す', ぜ: 'せ', ぞ: 'そ',
  だ: 'た', で: 'て', ど: 'と', ば: 'は', び: 'ひ', ぶ: 'ふ', べ: 'へ', ぼ: 'ほ', ぱ: 'は', ぴ: 'ひ', ぷ: 'ふ', ぺ: 'へ', ぽ: 'ほ',
};
const SMALL: Record<string, string> = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ' };
const BIG: Record<string, string> = { や: 'ゃ', ゆ: 'ゅ', よ: 'ょ' };
/** Kana that can be lengthened with the vowel kana, by final vowel (え → い as in せんせい, お → う as in こうこう). */
const LENGTHEN: Record<string, string> = { a: 'あ', i: 'い', u: 'う', e: 'い', o: 'う' };
/** Characters a small っ can stand in front of (k, s, t, p sounds). */
const GEMINABLE = /^[かきくけこさしすせそたちつてとぱぴぷぺぽ]/;
const N_ROW = /^[なにぬねの]/;

/** Split into morae, keeping small ゃゅょぁぃぅぇぉ attached to the kana before them. */
function morae(h: string): string[] {
  const out: string[] = [];
  for (const ch of h) {
    if (/[ゃゅょぁぃぅぇぉ]/.test(ch) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

const vowelOf = (mora: string) => toRomaji(mora).slice(-1);
const isVowel = (v: string) => 'aiueo'.includes(v);

/** Does `next` lengthen `prev`? (か+あ, せ+い, こ+う, any + ー) */
function lengthens(prev: string, next: string): boolean {
  if (next === 'ー') return true;
  const v = vowelOf(prev);
  if (!isVowel(v)) return false;
  return next === { a: 'あ', i: 'い', u: 'う', e: 'い', o: 'う' }[v] || next === { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' }[v];
}

export function soundAlikes(word: string): Alike[] {
  const katakana = /[ァ-ヺ]/.test(word) && !/[ぁ-ゖ]/.test(word);
  const h = toHiragana(word);
  const m = morae(h);
  const out: Alike[] = [];
  const add = (parts: string[], kind: AlikeKind) => {
    const s = parts.join('');
    if (s && s !== h) out.push({ kana: katakana ? toKatakana(s) : s, kind });
  };

  for (let i = 0; i < m.length; i++) {
    const cur = m[i], next = m[i + 1], prev = m[i - 1];

    // long vowels: remove an existing one, or add one after a short vowel
    if (prev && lengthens(prev, cur) && !(prev && m[i - 2] && lengthens(m[i - 2], prev))) {
      add([...m.slice(0, i), ...m.slice(i + 1)], 'long');
    } else if (cur !== 'っ' && cur !== 'ん' && cur !== 'ー' && isVowel(vowelOf(cur)) && !(next && lengthens(cur, next))) {
      add([...m.slice(0, i + 1), katakana ? 'ー' : LENGTHEN[vowelOf(cur)], ...m.slice(i + 1)], 'long');
    }

    // small っ: remove it, or insert one before k/s/t/p (never at the start)
    if (cur === 'っ') add([...m.slice(0, i), ...m.slice(i + 1)], 'sokuon');
    else if (i > 0 && prev !== 'っ' && prev !== 'ん' && prev !== 'ー' && GEMINABLE.test(cur)) {
      add([...m.slice(0, i), 'っ', ...m.slice(i)], 'sokuon');
    }

    // dakuten on/off for the first kana of a mora
    const head = cur[0], tail = cur.slice(1);
    const swapped = VOICE[head] ?? UNVOICE[head];
    if (swapped) add([...m.slice(0, i), swapped + tail, ...m.slice(i + 1)], 'voicing');

    // small ゃゅょ ↔ big やゆよ
    if (tail && SMALL[tail]) add([...m.slice(0, i), head + SMALL[tail], ...m.slice(i + 1)], 'small');
    if (prev && BIG[cur] && /[きぎしじちにひびぴみり]$/.test(prev) && !/[ゃゅょ]/.test(prev)) {
      add([...m.slice(0, i - 1), prev + BIG[cur], ...m.slice(i + 1)], 'small');
    }

    // ん before the n-row: こな ↔ こんな
    if (i > 0 && N_ROW.test(cur) && prev !== 'ん' && prev !== 'っ') add([...m.slice(0, i), 'ん', ...m.slice(i)], 'n');
    if (cur === 'ん' && next && N_ROW.test(next)) add([...m.slice(0, i), ...m.slice(i + 1)], 'n');
  }

  const seen = new Set<string>();
  return out.filter((a) => !seen.has(a.kana) && seen.add(a.kana));
}

/** Pick n variants, spreading them over different kinds of contrast. */
export function pickAlikes(word: string, n: number, rng: () => number): Alike[] {
  const all = soundAlikes(word);
  const byKind = new Map<AlikeKind, Alike[]>();
  for (const a of all) byKind.set(a.kind, [...(byKind.get(a.kind) ?? []), a]);
  const kinds = [...byKind.keys()].sort(() => rng() - 0.5);
  const out: Alike[] = [];
  while (out.length < n && kinds.some((k) => byKind.get(k)!.length)) {
    for (const k of kinds) {
      const list = byKind.get(k)!;
      if (!list.length || out.length >= n) continue;
      out.push(list.splice(Math.floor(rng() * list.length), 1)[0]);
    }
  }
  return out;
}

export const ALIKE_NOTE: Record<AlikeKind, string> = {
  long: 'a long vowel is held twice as long',
  sokuon: 'small っ is a short pause before the next sound',
  voicing: '゛ changes k/g, s/z, t/d, h/b',
  small: 'small ゃゅょ make one beat (きょ), big ones two (きよ)',
  n: 'ん is an extra beat of its own',
};
