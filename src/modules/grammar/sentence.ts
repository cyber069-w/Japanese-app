/**
 * Parser for the grammar sentence notation:
 *
 *   "私[わたし]{は} 学生[がくせい]です{か}。"
 *
 *   word[reading]  furigana for the kanji directly before the bracket
 *   {は}           a particle (used for the fill-in-the-blank exercise)
 *   space          separates the word chunks (used as tiles for sentence ordering)
 */
import type { RubyText } from '../../core/types';
import { toHiragana } from '../../lib/romaji';

export interface Seg { text: string; reading?: string; particle?: boolean }
export interface Chunk { segs: Seg[] }
export interface Sentence { chunks: Chunk[]; ruby: RubyText; reading: string; text: string }

const isKana = (c: string) => /[぀-ヿ]/.test(c);

function parseChunk(src: string): Chunk {
  const segs: Seg[] = [];
  let buf = '';
  const flush = () => {
    if (buf) segs.push({ text: buf });
    buf = '';
  };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '{') {
      const end = src.indexOf('}', i);
      flush();
      segs.push({ text: src.slice(i + 1, end), particle: true });
      i = end;
    } else if (c === '[') {
      const end = src.indexOf(']', i);
      const reading = src.slice(i + 1, end);
      // furigana belongs to the trailing run of non-kana characters (the kanji)
      let k = buf.length;
      while (k > 0 && !isKana(buf[k - 1])) k--;
      const before = buf.slice(0, k), base = buf.slice(k);
      buf = before;
      flush();
      segs.push({ text: base, reading });
      i = end;
    } else buf += c;
  }
  flush();
  return { segs };
}

export function parseSentence(src: string): Sentence {
  const chunks = src.trim().split(/\s+/).map(parseChunk);
  const ruby: RubyText = [];
  chunks.forEach((ch, ci) => {
    ch.segs.forEach((s) => ruby.push(s.reading ? [s.text, s.reading] : [s.text]));
    if (ci < chunks.length - 1) ruby.push([' ']);
  });
  const text = chunks.map(chunkText).join('');
  const reading = toHiragana(chunks.map((ch) => ch.segs.map((s) => s.reading ?? s.text).join('')).join(''));
  return { chunks, ruby, reading, text };
}

export const chunkText = (c: Chunk) => c.segs.map((s) => s.text).join('');
export const chunkRuby = (c: Chunk): RubyText => c.segs.map((s) => (s.reading ? [s.text, s.reading] : [s.text]));

/** Particles that can be blanked out in the fill-in exercise. */
export const PARTICLES = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'か', 'から', 'まで', 'や', 'ね', 'よ'];

/** Particles learners tend to confuse – preferred as wrong options. */
export const CONFUSED: Record<string, string[]> = {
  は: ['が', 'も', 'を'], が: ['は', 'を', 'に'], を: ['が', 'に', 'で'], に: ['で', 'へ', 'を'], で: ['に', 'へ', 'を'],
  へ: ['に', 'で', 'を'], と: ['や', 'も', 'に'], も: ['は', 'が', 'と'], の: ['は', 'が', 'に'], か: ['ね', 'よ', 'の'],
  から: ['まで', 'に', 'で'], まで: ['から', 'に', 'で'], や: ['と', 'も', 'の'], ね: ['よ', 'か'], よ: ['ね', 'か'],
};

const ARG = new Set(['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'から', 'まで']);

/**
 * All tile orders that are grammatical enough to accept:
 * phrases ending in a case particle may move freely, everything else
 * (modifiers, adverbs) stays directly in front of what follows it,
 * and the predicate stays last.
 */
export function validOrders(chunks: Chunk[]): number[][] {
  const n = chunks.length;
  const last = n - 1;
  const free = chunks.map((c, i) => {
    const s = c.segs[c.segs.length - 1];
    return i !== last && !!s?.particle && ARG.has(s.text);
  });
  // glue each non-free chunk to its successor
  const units: number[][] = [];
  let cur: number[] = [];
  for (let i = 0; i < n; i++) {
    cur.push(i);
    if (free[i] || i === last) {
      units.push(cur);
      cur = [];
    }
  }
  const head = units.slice(0, -1), tail = units[units.length - 1];
  const out: number[][] = [];
  const permute = (rest: number[][], acc: number[][]) => {
    if (out.length >= 120) return;
    if (!rest.length) {
      out.push([...acc.flat(), ...tail]);
      return;
    }
    rest.forEach((u, i) => permute([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, u]));
  };
  permute(head, []);
  return out;
}
