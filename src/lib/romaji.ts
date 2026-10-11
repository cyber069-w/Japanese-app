/**
 * Romaji ⇄ kana conversion and answer checking.
 *
 * - toKana():  IME-style converter (type "neko" → ねこ). Accepts all common
 *              spellings: shi/si, chi/ti, tsu/tu, fu/hu, ji/zi, sha/sya, n/nn/n'.
 * - toRomaji(): Hepburn romanisation used to display answers ("gakkou").
 * - matchesReading(): checks a typed answer (romaji OR kana) against the
 *              expected kana, with three leniency levels.
 */

export type Leniency = 'strict' | 'normal' | 'lenient';

// ---------------------------------------------------------------------------
// Kana → romaji tables (Hepburn)
// ---------------------------------------------------------------------------

const MONO: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', ゐ: 'i', ゑ: 'e', を: 'wo', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ゔ: 'vu',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o', ゃ: 'ya', ゅ: 'yu', ょ: 'yo', ゎ: 'wa',
};

/** Two-kana combinations (yōon and the extended sounds used in loanwords). */
const DI: Record<string, string> = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo', ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho', じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho', ぢゃ: 'ja', ぢゅ: 'ju', ぢょ: 'jo',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo', ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo', ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo', りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  しぇ: 'she', じぇ: 'je', ちぇ: 'che', いぇ: 'ye',
  てぃ: 'ti', でぃ: 'di', とぅ: 'tu', どぅ: 'du', でゅ: 'dyu', てゅ: 'tyu',
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo', ふゅ: 'fyu',
  うぃ: 'wi', うぇ: 'we', うぉ: 'wo',
  ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo',
  つぁ: 'tsa', つぃ: 'tsi', つぇ: 'tse', つぉ: 'tso',
};

const isKatakana = (c: string) => c >= 'ァ' && c <= 'ヶ';
const isHiragana = (c: string) => c >= 'ぁ' && c <= 'ゖ';

/** カタカナ → ひらがな (ー and other characters are kept). */
export function toHiragana(s: string): string {
  let out = '';
  for (const c of s) out += isKatakana(c) ? String.fromCharCode(c.charCodeAt(0) - 0x60) : c;
  return out;
}

/** ひらがな → カタカナ. */
export function toKatakana(s: string): string {
  let out = '';
  for (const c of s) out += isHiragana(c) ? String.fromCharCode(c.charCodeAt(0) + 0x60) : c;
  return out;
}

export const hasKana = (s: string) => /[ぁ-ゖァ-ヺー]/.test(s);

export interface RomajiOptions {
  /** 'double' → gakkou / koohii (default), 'macron' → gakkō / kōhī (only for ー and おう/うう). */
  long?: 'double' | 'macron';
  /** Write n' before vowels / y (kin'en). Default true. */
  apostrophe?: boolean;
}

/** Hepburn romanisation (wāpuro style by default: おう → ou, ー → repeated vowel). */
export function toRomaji(input: string, opts: RomajiOptions = {}): string {
  const s = toHiragana(input);
  const apostrophe = opts.apostrophe ?? true;
  const parts: string[] = [];
  let i = 0;
  let geminate = false;
  while (i < s.length) {
    const c = s[i];
    const two = s.slice(i, i + 2);
    let r: string | undefined;
    if (DI[two]) {
      r = DI[two];
      i += 2;
    } else if (c === 'っ') {
      geminate = true;
      i += 1;
      continue;
    } else if (c === 'ー') {
      const prev = parts.length ? parts[parts.length - 1] : '';
      const v = prev.slice(-1);
      r = 'aiueo'.includes(v) && v ? v : '';
      i += 1;
    } else if (MONO[c] !== undefined) {
      r = MONO[c];
      i += 1;
    } else {
      r = c;
      i += 1;
    }
    if (geminate) {
      // っ doubles the next consonant; Hepburn writes っち as "tchi"
      if (r.startsWith('ch')) r = 't' + r;
      else if (/^[bcdfghjklmpqrstvwxyz]/.test(r)) r = r[0] + r;
      geminate = false;
    }
    parts.push(r);
  }
  let out = '';
  for (let k = 0; k < parts.length; k++) {
    const p = parts[k];
    out += p;
    if (p === 'n' && apostrophe && k + 1 < parts.length && /^[aiueoy]/.test(parts[k + 1])) out += "'";
  }
  if (opts.long === 'macron') {
    out = out
      .replace(/ou/g, 'ō').replace(/oo/g, 'ō').replace(/uu/g, 'ū')
      .replace(/aa/g, 'ā').replace(/ii/g, 'ī').replace(/ee/g, 'ē');
  }
  return out;
}

/**
 * Romaji for showing a word or phrase: spaces kept, punctuation dropped, particles
 * written as they are said – こんばんは → konbanwa, わたしは がくせいです → watashi wa gakusei desu.
 */
export function phraseRomaji(kana: string): string {
  const words = kana.replace(/[。、？！?!「」・]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const phrase = words.length > 1;
  return words
    .map((w) => {
      const r = toRomaji(w);
      const len = [...w].length;
      if (/(にち|ばん|で)は$/.test(w)) return r.slice(0, -2) + 'wa';
      if (!phrase || len < 2) return r;
      if (w.endsWith('は')) return r.slice(0, -2) + ' wa';
      if (w.endsWith('へ')) return r.slice(0, -2) + ' e';
      if (w.endsWith('を')) return r.slice(0, -2) + ' o';
      return r;
    })
    .join(' ');
}

// ---------------------------------------------------------------------------
// Romaji → kana (IME style)
// ---------------------------------------------------------------------------

const R2K: Record<string, string> = {
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ', ca: 'か', cu: 'く', co: 'こ', ci: 'し', ce: 'せ',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  sa: 'さ', si: 'し', shi: 'し', su: 'す', se: 'せ', so: 'そ',
  za: 'ざ', zi: 'じ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  ta: 'た', ti: 'ち', chi: 'ち', tu: 'つ', tsu: 'つ', te: 'て', to: 'と',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', hu: 'ふ', fu: 'ふ', he: 'へ', ho: 'ほ',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ', yi: 'い', ye: 'いぇ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  la: 'ら', li: 'り', lu: 'る', le: 'れ', lo: 'ろ',
  wa: 'わ', wi: 'うぃ', we: 'うぇ', wo: 'を',
  va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',
  fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ', fyu: 'ふゅ',
  sha: 'しゃ', shu: 'しゅ', she: 'しぇ', sho: 'しょ', sya: 'しゃ', syu: 'しゅ', sye: 'しぇ', syo: 'しょ',
  ja: 'じゃ', ju: 'じゅ', je: 'じぇ', jo: 'じょ', jya: 'じゃ', jyu: 'じゅ', jye: 'じぇ', jyo: 'じょ',
  zya: 'じゃ', zyu: 'じゅ', zye: 'じぇ', zyo: 'じょ',
  cha: 'ちゃ', chu: 'ちゅ', che: 'ちぇ', cho: 'ちょ', tya: 'ちゃ', tyu: 'ちゅ', tye: 'ちぇ', tyo: 'ちょ',
  cya: 'ちゃ', cyu: 'ちゅ', cye: 'ちぇ', cyo: 'ちょ',
  dya: 'ぢゃ', dyu: 'ぢゅ', dyo: 'ぢょ',
  thi: 'てぃ', dhi: 'でぃ', dhu: 'でゅ', twu: 'とぅ', dwu: 'どぅ',
  tsa: 'つぁ', tsi: 'つぃ', tse: 'つぇ', tso: 'つぉ',
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ', gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ', hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ', pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ', rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  lya: 'りゃ', lyu: 'りゅ', lyo: 'りょ',
  xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ', xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ',
  xtu: 'っ', xtsu: 'っ', ltu: 'っ', ltsu: 'っ', xwa: 'ゎ',
};
const R2K_KEYS_BY_LEN = [4, 3, 2, 1];
const PREFIXES = new Set<string>();
for (const k of Object.keys(R2K)) for (let n = 1; n < k.length; n++) PREFIXES.add(k.slice(0, n));

const VOWEL = /[aiueo]/;
const CONSONANT = /[bcdfghjklmpqrstvwxz]/;
const PUNCT: Record<string, string> = { '-': 'ー', '.': '。', ',': '、', '?': '？', '!': '！', '~': '〜' };

export interface KanaOptions {
  katakana?: boolean;
  /** When false (live typing), a trailing "n" or partial syllable stays in latin. Default true. */
  final?: boolean;
}

/** IME-style romaji → kana. Kana already present in the input is kept. */
export function toKana(input: string, opts: KanaOptions = {}): string {
  const s = input.toLowerCase();
  const final = opts.final ?? true;
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const next = s[i + 1] ?? '';
    if (!/[a-z'\-.,?!~]/.test(c)) {
      out += c; // kana, spaces, digits …
      i++;
      continue;
    }
    if (PUNCT[c]) {
      out += PUNCT[c];
      i++;
      continue;
    }
    if (c === "'") {
      i++;
      continue;
    }
    if (c === 'n') {
      if (next === "'") { out += 'ん'; i += 2; continue; }
      if (next === 'n') {
        const after = s[i + 2] ?? '';
        // "konna" → こんな (consume one n), "kinn" → きん (consume both)
        if (VOWEL.test(after) || after === 'y') { out += 'ん'; i += 1; } else { out += 'ん'; i += 2; }
        continue;
      }
      if (next === '') {
        out += final ? 'ん' : 'n';
        i++;
        continue;
      }
      if (!VOWEL.test(next) && next !== 'y') { out += 'ん'; i++; continue; }
    }
    // small っ: doubled consonant ("kk", "tt") or "tch"
    if (CONSONANT.test(c) && c !== 'n' && (next === c || (c === 't' && next === 'c' && s[i + 2] === 'h'))) {
      out += 'っ';
      i++;
      continue;
    }
    let matched = false;
    for (const len of R2K_KEYS_BY_LEN) {
      const chunk = s.slice(i, i + len);
      if (chunk.length === len && R2K[chunk]) {
        out += R2K[chunk];
        i += len;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    // Incomplete syllable at the end while typing: keep latin
    const rest = s.slice(i);
    if (!final && PREFIXES.has(rest)) { out += rest; break; }
    out += c;
    i++;
  }
  return opts.katakana ? toKatakana(out) : out;
}

// ---------------------------------------------------------------------------
// Answer checking
// ---------------------------------------------------------------------------

const MACRONS: Record<string, string> = {
  ā: 'aa', ī: 'ii', ū: 'uu', ē: 'ee', ō: 'ou', â: 'aa', î: 'ii', û: 'uu', ê: 'ee', ô: 'ou',
};

function cleanInput(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[āīūēōâîûêô]/g, (m) => MACRONS[m])
    .replace(/[\s・·.,!?。、！？「」()（）\[\]]/g, '')
    .trim();
}

/** Spelling-independent key: variants like shi/si already unified by going through kana. */
function soundKey(romaji: string): string {
  return romaji
    .replace(/ou/g, 'oo')
    .replace(/ei/g, 'ee')
    .replace(/wo/g, 'o');
}

/** Even looser: ignores long vowels and the n' apostrophe (gakko = gakkou). */
function looseKey(romaji: string): string {
  return soundKey(romaji).replace(/'/g, '').replace(/([aiueo])\1+/g, '$1');
}

/** Turn any answer (romaji or kana) into canonical Hepburn via kana. */
function canonicalOf(answer: string): string {
  const cleaned = cleanInput(answer);
  const kana = hasKana(cleaned) ? cleaned : toKana(cleaned);
  return toRomaji(kana);
}

/**
 * Does `input` (romaji or kana) read like `expectedKana`?
 * `extra` are additional accepted romaji spellings (e.g. "konnichiwa" for こんにちは).
 */
export function matchesReading(
  input: string,
  expectedKana: string,
  leniency: Leniency = 'normal',
  extra: string[] = [],
): boolean {
  const raw = cleanInput(input);
  if (!raw) return false;
  const expected = cleanInput(expectedKana);
  const targets = [toRomaji(expected), ...extra.map(canonicalOf)];

  if (leniency === 'strict') {
    // Only standard Hepburn: long vowels doubled (gakkou) or with macrons (gakkō)
    const typed = input.normalize('NFKC').toLowerCase().replace(/\s/g, '');
    if (hasKana(typed)) return targets.includes(toRomaji(typed));
    const allowed = [...targets, toRomaji(expected, { long: 'macron' }), ...extra.map((e) => e.toLowerCase())];
    return allowed.includes(typed);
  }
  const typed = hasKana(raw) ? toRomaji(raw) : toRomaji(toKana(raw));
  const key = leniency === 'lenient' ? looseKey : soundKey;
  return targets.some((t) => key(typed) === key(t));
}

/**
 * Exact kana comparison for "type the word in kana" exercises.
 * Ignores script (ねこ = ネコ), spaces/punctuation and how a long vowel is written (ー vs the vowel).
 */
export function kanaEquals(input: string, expected: string): boolean {
  const norm = (s: string) => {
    const h = toHiragana(cleanInput(hasKana(s) ? s : toKana(s)));
    // ー → the vowel it lengthens, so こーひー = こおひい
    let out = '';
    for (const ch of h) {
      if (ch === 'ー' && out) {
        const v = toRomaji(out.slice(-1)).slice(-1);
        out += ({ a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' } as Record<string, string>)[v] ?? '';
      } else out += ch;
    }
    return out;
  };
  return norm(input) === norm(expected) && norm(input) !== '';
}
