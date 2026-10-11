/**
 * Suggests how a (mostly German-speaking) name or place is written in katakana:
 *
 *   Maximilian → マクシミリアン   Müller → ミュラー   Anna → アンナ   Stefan → シュテファン
 *   St. Gallen → ザンクト・ガレン   Friedrich → フリードリヒ   Max → マックス
 *
 * It follows German pronunciation (j = y, s before a vowel = z, ie = long i, final -er = ー),
 * so the result is a suggestion the user can edit – foreign names have no single correct spelling.
 * Words are joined with ・ and hyphens become ＝, as in Japanese.
 */

/** Established spellings the rules would get wrong. */
const EXCEPTIONS: Record<string, string> = {
  lukas: 'ルーカス', peter: 'ペーター', otto: 'オットー', thomas: 'トーマス', johannes: 'ヨハネス',
  david: 'ダビド', eva: 'エーファ', uwe: 'ウーヴェ', simon: 'ジーモン', lisa: 'リーザ', nora: 'ノーラ',
  tom: 'トム', jakob: 'ヤーコプ', martin: 'マルティン', anja: 'アニャ', sven: 'スヴェン',
  // places (university cities)
  zuerich: 'チューリッヒ', zürich: 'チューリッヒ', zurich: 'チューリッヒ', genf: 'ジュネーブ', geneva: 'ジュネーブ',
  geneve: 'ジュネーブ', lausanne: 'ローザンヌ', basel: 'バーゼル', fribourg: 'フリブール', neuchatel: 'ヌーシャテル',
  lugano: 'ルガーノ', wien: 'ウィーン', vienna: 'ウィーン', graz: 'グラーツ', münchen: 'ミュンヘン', muenchen: 'ミュンヘン',
  munich: 'ミュンヘン', berlin: 'ベルリン', hamburg: 'ハンブルク', bern: 'ベルン', zug: 'ツーク', chur: 'クール',
  winterthur: 'ヴィンタートゥール', hannover: 'ハノーファー', aachen: 'アーヘン', bremen: 'ブレーメン',
};

/** Katakana for consonant + vowel (a i u e o ü). Capital letters are internal sound markers. */
const SYL: Record<string, string[]> = {
  '': ['ア', 'イ', 'ウ', 'エ', 'オ', 'ユ'],
  k: ['カ', 'キ', 'ク', 'ケ', 'コ', 'キュ'],
  g: ['ガ', 'ギ', 'グ', 'ゲ', 'ゴ', 'ギュ'],
  s: ['サ', 'シ', 'ス', 'セ', 'ソ', 'シュ'],
  z: ['ザ', 'ジ', 'ズ', 'ゼ', 'ゾ', 'ジュ'],
  t: ['タ', 'ティ', 'トゥ', 'テ', 'ト', 'テュ'],
  d: ['ダ', 'ディ', 'ドゥ', 'デ', 'ド', 'デュ'],
  T: ['ツァ', 'ツィ', 'ツ', 'ツェ', 'ツォ', 'ツュ'], // ts
  n: ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ', 'ニュ'],
  h: ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ', 'ヒュ'],
  f: ['ファ', 'フィ', 'フ', 'フェ', 'フォ', 'フュ'],
  b: ['バ', 'ビ', 'ブ', 'ベ', 'ボ', 'ビュ'],
  p: ['パ', 'ピ', 'プ', 'ペ', 'ポ', 'ピュ'],
  m: ['マ', 'ミ', 'ム', 'メ', 'モ', 'ミュ'],
  y: ['ヤ', 'イ', 'ユ', 'イェ', 'ヨ', 'ユ'],
  r: ['ラ', 'リ', 'ル', 'レ', 'ロ', 'リュ'],
  w: ['ワ', 'ヴィ', 'ヴ', 'ヴェ', 'ヴォ', 'ヴュ'],
  S: ['シャ', 'シ', 'シュ', 'シェ', 'ショ', 'シュ'], // sch
  C: ['チャ', 'チ', 'チュ', 'チェ', 'チョ', 'チュ'], // tsch
  X: ['ヒャ', 'ヒ', 'ヒュ', 'ヒェ', 'ヒョ', 'ヒュ'], // ich-Laut
  H: ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ', 'ヒュ'], // ach-Laut
};
/** A consonant with no vowel after it. */
const BARE: Record<string, string> = {
  k: 'ク', g: 'グ', s: 'ス', z: 'ズ', t: 'ト', d: 'ド', T: 'ツ', h: 'フ', f: 'フ', b: 'ブ', p: 'プ',
  m: 'ム', y: 'イ', r: 'ル', w: 'ヴ', S: 'シュ', C: 'チュ', X: 'ヒ', n: 'ン',
};
const VOWELS = 'aiueoü';
const ECHO: Record<string, string> = { a: 'ハ', i: 'ヒ', u: 'フ', e: 'ヘ', o: 'ホ', ü: 'ヒュ' };

/** Rewrite German spelling into simple sound letters (see SYL for the markers). */
function normalize(word: string): string {
  let w = word
    .toLowerCase()
    .replace(/ä/g, 'e').replace(/ö/g, 'e').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/(?!\u0308)[\u0300-\u036f]/g, '').normalize('NFC') // é → e, keep ü
    .replace(/^st\.?$/, 'sankt');
  w = w
    .replace(/tsch/g, 'C')
    .replace(/sch/g, 'S')
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/^ch(?=a)/, 'S') // Charlotte
    .replace(/^ch/, 'k') // Christian
    .replace(/([aou])ch/g, '$1QH') // Bach, Jochen
    .replace(/ch/g, 'X') // Friedrich, Michael
    .replace(/ig$/, 'iX') // Leipzig, Ludwig
    .replace(/ck/g, 'Qk')
    .replace(/tz/g, 'QT')
    .replace(/ts/g, 'T')
    .replace(/dt/g, 'Qt')
    .replace(/x$/, 'Qks')
    .replace(/x/g, 'ks')
    .replace(/qu/g, 'kw')
    .replace(/ei/g, 'ai')
    .replace(/eu/g, 'oi')
    .replace(/iel/g, 'i_el') // Daniel: i and e stay apart
    .replace(/ie/g, 'iL') // Dieter, Marie
    .replace(/aa/g, 'aL').replace(/ee/g, 'eL').replace(/oo/g, 'oL')
    .replace(/([aeiouü])h(?![aeiouü])/g, (_, v: string, off: number, str: string) => (off + 2 === str.length ? v : v + 'L')) // Lehmann; final h is silent (Noah)
    .replace(/er$/, 'aL') // Müller
    .replace(/ar$/, 'aL') // Oskar
    .replace(/^s(?=[aeiouü])/, 'Z') // Sabine
    .replace(/^s(?=[tp])/, 'S') // Stefan
    .replace(/z/g, 'T')
    .replace(/Z/g, 'z')
    .replace(/v/g, 'b')
    .replace(/j/g, 'y')
    .replace(/y(?![aeiouü])/g, 'i')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/ll/g, 'l').replace(/rr/g, 'r').replace(/mm/g, 'm')
    .replace(/l/g, 'r')
    .replace(/nn(?=[aeiouü])/g, 'Nn') // Anna
    .replace(/nn/g, 'n') // Finn
    .replace(/([bdfgkpst])\1/g, 'Q$1') // Lotte, Philipp
    .replace(/d$/, 't') // Bernd
    .replace(/([^n])g$/, '$1k') // Hamburg
    .replace(/_/g, '');
  return w;
}

function wordToKatakana(word: string): string {
  const key = word.toLowerCase().replace(/\.$/, '');
  if (EXCEPTIONS[key]) return EXCEPTIONS[key];
  const w = normalize(word);
  let out = '';
  let prevVowel = '';
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    const next = w[i + 1] ?? '';
    if (c === 'Q') { out += 'ッ'; continue; }
    if (c === 'L') { out += 'ー'; continue; }
    if (c === 'N') { out += 'ン'; continue; }
    if (VOWELS.includes(c)) {
      out += SYL[''][VOWELS.indexOf(c)];
      prevVowel = c;
      continue;
    }
    if (!SYL[c] && !BARE[c]) continue; // digits, apostrophes …
    if (next && VOWELS.includes(next) && SYL[c]) {
      out += SYL[c][VOWELS.indexOf(next)];
      prevVowel = next;
      i++;
      continue;
    }
    if (c === 'H') { out += ECHO[prevVowel] ?? 'フ'; continue; }
    if (c === 'm' && /[bp]/.test(next)) { out += 'ン'; continue; }
    out += BARE[c] ?? '';
  }
  return out;
}

const hasJapanese = (s: string) => /[぀-ヿ㐀-鿿]/.test(s);

export function nameToKatakana(input: string): string {
  const s = input.trim();
  if (!s || hasJapanese(s)) return s;
  return s
    .split(/\s+/)
    .map((part) => part.split('-').filter(Boolean).map(wordToKatakana).join('＝'))
    .filter(Boolean)
    .join('・');
}
