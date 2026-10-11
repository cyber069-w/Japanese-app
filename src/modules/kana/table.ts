/**
 * Kana tables shared by the Hiragana and Katakana modules.
 * Everything is defined once in hiragana and converted to katakana.
 */
import { toKatakana, toRomaji } from '../../lib/romaji';
import type { FilterGroup, Preset } from '../../core/types';

export type Script = 'hiragana' | 'katakana';
export type KanaType = 'basic' | 'dakuten' | 'combo' | 'extended';

export interface KanaChar {
  id: string;
  kana: string;
  romaji: string;
  row: string;
  type: KanaType;
  /** Base character (か for が, き for きゃ) – used for hints. */
  base?: string;
}

/** Rows in gojūon order; null = empty cell in the chart. */
const BASIC: Array<[string, Array<string | null>]> = [
  ['a', ['あ', 'い', 'う', 'え', 'お']],
  ['ka', ['か', 'き', 'く', 'け', 'こ']],
  ['sa', ['さ', 'し', 'す', 'せ', 'そ']],
  ['ta', ['た', 'ち', 'つ', 'て', 'と']],
  ['na', ['な', 'に', 'ぬ', 'ね', 'の']],
  ['ha', ['は', 'ひ', 'ふ', 'へ', 'ほ']],
  ['ma', ['ま', 'み', 'む', 'め', 'も']],
  ['ya', ['や', null, 'ゆ', null, 'よ']],
  ['ra', ['ら', 'り', 'る', 'れ', 'ろ']],
  ['wa', ['わ', null, null, null, 'を']],
  ['n', ['ん', null, null, null, null]],
];

const DAKUTEN: Array<[string, string[], string]> = [
  ['ga', ['が', 'ぎ', 'ぐ', 'げ', 'ご'], 'ka'],
  ['za', ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'], 'sa'],
  ['da', ['だ', 'ぢ', 'づ', 'で', 'ど'], 'ta'],
  ['ba', ['ば', 'び', 'ぶ', 'べ', 'ぼ'], 'ha'],
  ['pa', ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'], 'ha'],
];

const COMBO_BASES = ['き', 'し', 'ち', 'に', 'ひ', 'み', 'り', 'ぎ', 'じ', 'び', 'ぴ'];

/** Extra katakana sounds for loanwords. */
const EXTENDED = ['てぃ', 'でぃ', 'でゅ', 'ふぁ', 'ふぃ', 'ふぇ', 'ふぉ', 'うぃ', 'うぇ', 'うぉ', 'しぇ', 'じぇ', 'ちぇ', 'ゔ'];

const UNDAKU: Record<string, string> = {};
for (const [, chars, baseRow] of DAKUTEN) {
  const base = BASIC.find(([r]) => r === baseRow)![1];
  chars.forEach((c, i) => (UNDAKU[c] = base[i]!));
}

/** Unique ids: ぢ/づ read the same as じ/ず, so they get their own ids. */
function idFor(kana: string): string {
  if (kana === 'ぢ') return 'ji2';
  if (kana === 'づ') return 'zu2';
  if (kana === 'うぉ') return 'uo';
  return toRomaji(kana);
}

export function buildKana(script: Script): KanaChar[] {
  const conv = (k: string) => (script === 'katakana' ? toKatakana(k) : k);
  const out: KanaChar[] = [];
  for (const [row, chars] of BASIC) {
    for (const k of chars) if (k) out.push({ id: idFor(k), kana: conv(k), romaji: toRomaji(k), row, type: 'basic' });
  }
  for (const [row, chars] of DAKUTEN) {
    for (const k of chars) out.push({ id: idFor(k), kana: conv(k), romaji: toRomaji(k), row, type: 'dakuten', base: conv(UNDAKU[k]) });
  }
  for (const b of COMBO_BASES) {
    const row = toRomaji(b + 'ゃ');
    for (const small of ['ゃ', 'ゅ', 'ょ']) {
      const k = b + small;
      out.push({ id: idFor(k), kana: conv(k), romaji: toRomaji(k), row, type: 'combo', base: conv(b) });
    }
  }
  if (script === 'katakana') {
    for (const k of EXTENDED) out.push({ id: idFor(k), kana: conv(k), romaji: toRomaji(k), row: 'ext', type: 'extended', base: conv(k[0]) });
  }
  return out;
}

export function kanaGroups(script: Script): FilterGroup[] {
  const conv = (k: string) => (script === 'katakana' ? toKatakana(k) : k);
  const groups: FilterGroup[] = [
    ...BASIC.map(([row, chars]) => ({ id: row, label: conv(chars[0]!), sub: row === 'n' ? 'n' : row, section: 'Basic' })),
    ...DAKUTEN.map(([row, chars]) => ({ id: row, label: conv(chars[0]), sub: row, section: 'Dakuten ゛ ゜' })),
    ...COMBO_BASES.map((b) => ({ id: toRomaji(b + 'ゃ'), label: conv(b + 'ゃ'), sub: toRomaji(b + 'ゃ'), section: 'Combinations' })),
  ];
  if (script === 'katakana') groups.push({ id: 'ext', label: 'ティ', sub: 'ti, fa …', section: 'Loanword sounds' });
  return groups;
}

export const BASIC_ROWS = BASIC.map(([r]) => r);
export const DAKUTEN_ROWS = DAKUTEN.map(([r]) => r);
export const COMBO_ROWS = COMBO_BASES.map((b) => toRomaji(b + 'ゃ'));

export function kanaPresets(script: Script): Preset[] {
  const ps: Preset[] = [
    { id: 'basic', label: 'Basic 46', groups: BASIC_ROWS },
    { id: 'dakuten', label: 'All dakuten', groups: DAKUTEN_ROWS },
    { id: 'combos', label: 'All combos', groups: COMBO_ROWS },
    { id: 'all', label: 'Everything', groups: [...BASIC_ROWS, ...DAKUTEN_ROWS, ...COMBO_ROWS, ...(script === 'katakana' ? ['ext'] : [])] },
  ];
  return ps;
}

/** Chart layout (gojūon grid) as ids – null = empty cell. */
export function kanaChartLayout() {
  const basic = BASIC.flatMap(([, chars]) => chars.map((k) => (k ? idFor(k) : null)));
  const dakuten = DAKUTEN.flatMap(([, chars]) => chars.map((k) => idFor(k)));
  const combos = COMBO_BASES.flatMap((b) => ['ゃ', 'ゅ', 'ょ'].map((s) => idFor(b + s)));
  return { basic, dakuten, combos, extended: EXTENDED.map(idFor) };
}

/** Rows (groups) a word needs: every character's row; small っ and ー need nothing extra. */
export function rowsOfWord(word: string, chars: KanaChar[]): string[] | null {
  const byKana = new Map(chars.map((c) => [c.kana, c]));
  const rows = new Set<string>();
  const w = [...word];
  for (let i = 0; i < w.length; i++) {
    const two = w[i] + (w[i + 1] ?? '');
    if (byKana.has(two) && /[ゃゅょャュョィェォァゥ]/.test(w[i + 1] ?? '')) {
      rows.add(byKana.get(two)!.row);
      i++;
      continue;
    }
    if (/[っッー]/.test(w[i])) continue;
    const c = byKana.get(w[i]);
    if (!c) return null; // character not in our table
    rows.add(c.row);
  }
  return [...rows];
}
