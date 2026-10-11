import type { RubyText } from '../core/types';
import { toHiragana } from './romaji';

const isKana = (c: string) => /[぀-ヿ～〜ー、。？！?!・\s]/.test(c);

/**
 * Align a kanji spelling with its reading so furigana only sits on the kanji:
 *   起きます + おきます → [["起","お"],["きます"]]
 *   お名前は？ + おなまえは？ → [["お"],["名前","なまえ"],["は？"]]
 * Falls back to one ruby over the whole word when alignment isn't possible.
 */
export function alignRuby(written: string, reading: string): RubyText {
  if (!written || written === reading) return [[reading]];
  const runs: Array<{ text: string; kana: boolean }> = [];
  for (const ch of written) {
    const k = isKana(ch);
    const last = runs[runs.length - 1];
    if (last && last.kana === k) last.text += ch;
    else runs.push({ text: ch, kana: k });
  }
  if (runs.every((r) => r.kana)) return [[written]];
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = runs.map((r) => (r.kana ? esc(toHiragana(r.text)) : '(.+?)')).join('');
  // match on hiragana, but cut the furigana from the original reading (keeps katakana as written)
  const m = new RegExp(`^${pattern}$`, 'd').exec(toHiragana(reading));
  if (!m?.indices) return [[written, reading]];
  let g = 1;
  return runs.map((r) => {
    if (r.kana) return [r.text];
    const [a, b] = m.indices![g++]!;
    return [r.text, reading.slice(a, b)];
  }) as RubyText;
}

/** Plain text of a RubyText (base characters only). */
export const rubyBase = (r: RubyText) => r.map(([b]) => b).join('');
/** Reading of a RubyText (kana). */
export const rubyReading = (r: RubyText) => r.map(([b, rt]) => rt ?? b).join('');

/**
 * Parse the compact sentence notation used in the grammar data:
 *   "私[わたし]は 学生[がくせい]です。" → [["私","わたし"],["は"],["学生","がくせい"],["です。"]]
 * Spaces are only separators and are dropped.
 */
export function parseRubyNotation(s: string): RubyText {
  const out: RubyText = [];
  const re = /([^\s[\]]+?)\[([^\]]+)\]|([^\s[\]]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m[1]) {
      // split leading kana from the kanji part: "お名[な]" style isn't used, but keep it safe
      out.push([m[1], m[2]]);
    } else if (m[3]) out.push([m[3]]);
  }
  return out;
}
