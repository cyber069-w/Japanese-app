/**
 * Japanese readings for numbers, times, dates, prices and counters.
 *
 * Every function returns a Reading:
 *   kana  – the standard reading (shown as the answer)
 *   alts  – other readings that are also correct (しち for 7, はん for :30 …)
 *   rules – ids of the sound-change rules involved, used for hints (see RULES)
 */

export interface Reading {
  kana: string;
  alts: string[];
  rules: RuleId[];
}

export type RuleId =
  | 'four' | 'seven' | 'nine' | 'zero'
  | 'hyaku-1' | 'hyaku-3' | 'hyaku-6' | 'hyaku-8'
  | 'sen-1' | 'sen-3' | 'sen-8'
  | 'man' | 'man-1'
  | 'ji-4' | 'ji-7' | 'ji-9'
  | 'pun' | 'han'
  | 'gatsu-4' | 'gatsu-7' | 'gatsu-9'
  | 'date-special' | 'date-14-24'
  | 'en-4' | 'nen-4'
  | 'tsu' | 'nin' | 'hon' | 'sai' | 'hatachi' | 'kai';

/** Short rule explanations shown in hints and on the rules page. */
export const RULES: Record<RuleId, string> = {
  four: '4 is usually よん (し is avoided because it sounds like 死, death).',
  seven: '7 is usually なな; しち is also correct.',
  nine: '9 is usually きゅう; く is also correct.',
  zero: '0 is ゼロ or れい.',
  'hyaku-1': '100 is just ひゃく – never いちひゃく.',
  'hyaku-3': '300 = さんびゃく: after さん, ひゃく becomes びゃく.',
  'hyaku-6': '600 = ろっぴゃく: ろく + ひゃく → ろっぴゃく.',
  'hyaku-8': '800 = はっぴゃく: はち + ひゃく → はっぴゃく.',
  'sen-1': '1,000 is just せん – no いち needed.',
  'sen-3': '3,000 = さんぜん: after さん, せん becomes ぜん.',
  'sen-8': '8,000 = はっせん: はち + せん → はっせん.',
  man: 'Japanese groups digits by 10,000 (まん): 25,000 = にまんごせん.',
  'man-1': '10,000 = いちまん – unlike ひゃく and せん, まん always needs いち.',
  'ji-4': '4 o’clock = よじ (not よんじ).',
  'ji-7': '7 o’clock = しちじ.',
  'ji-9': '9 o’clock = くじ (not きゅうじ).',
  pun: 'Minutes: 1, 3, 4, 6, 8, 10 → ぷん (いっぷん, さんぷん, よんぷん, ろっぷん, はっぷん, じゅっぷん); 2, 5, 7, 9 → ふん.',
  han: ':30 can be said as はん (half).',
  'gatsu-4': 'April = しがつ (not よんがつ).',
  'gatsu-7': 'July = しちがつ.',
  'gatsu-9': 'September = くがつ.',
  'date-special': 'Days 1–10 of the month have native readings: ついたち, ふつか, みっか, よっか, いつか, むいか, なのか, ようか, ここのか, とおか.',
  'date-14-24': '14th, 20th and 24th are special too: じゅうよっか, はつか, にじゅうよっか.',
  'en-4': 'Yen ending in 4 uses よ: 4円 = よえん, 14円 = じゅうよえん.',
  'nen-4': 'Years ending in 4 use よ: 4年 = よねん.',
  tsu: '〜つ counts things: ひとつ, ふたつ, みっつ, よっつ, いつつ, むっつ, ななつ, やっつ, ここのつ, とお.',
  nin: 'People: ひとり, ふたり are special; from 3 on it is 〜にん (よにん for 4).',
  hon: 'Long thin things (pens, bottles): いっぽん, にほん, さんぼん, よんほん, ごほん, ろっぽん, ななほん, はっぽん, きゅうほん, じゅっぽん.',
  sai: 'Age: いっさい, はっさい, じゅっさい have small っ.',
  hatachi: '20 years old = はたち.',
  kai: 'Floors: いっかい, さんがい, ろっかい, はっかい, じゅっかい.',
};

const r = (kana: string, alts: string[] = [], rules: RuleId[] = []): Reading => ({ kana, alts, rules });

/** Combine readings: every combination of the parts' variants is accepted. */
function join(parts: Reading[]): Reading {
  let combos = [''];
  for (const p of parts) {
    const variants = [p.kana, ...p.alts];
    const next: string[] = [];
    for (const c of combos) for (const v of variants) next.push(c + v);
    combos = next.slice(0, 64); // plenty of variants, but keep it bounded
  }
  const rules = [...new Set(parts.flatMap((p) => p.rules))];
  return { kana: combos[0], alts: [...new Set(combos.slice(1))], rules };
}

const ONES: Record<number, Reading> = {
  1: r('いち'), 2: r('に'), 3: r('さん'), 4: r('よん', ['し'], ['four']), 5: r('ご'),
  6: r('ろく'), 7: r('なな', ['しち'], ['seven']), 8: r('はち'), 9: r('きゅう', ['く'], ['nine']),
};

function tens(d: number): Reading {
  if (d === 1) return r('じゅう');
  if (d === 4) return r('よんじゅう', [], ['four']);
  if (d === 7) return r('ななじゅう', ['しちじゅう'], ['seven']);
  if (d === 9) return r('きゅうじゅう', [], ['nine']);
  return r(ONES[d].kana + 'じゅう');
}

function hundreds(d: number): Reading {
  switch (d) {
    case 1: return r('ひゃく', [], ['hyaku-1']);
    case 3: return r('さんびゃく', [], ['hyaku-3']);
    case 6: return r('ろっぴゃく', [], ['hyaku-6']);
    case 8: return r('はっぴゃく', [], ['hyaku-8']);
    case 4: return r('よんひゃく', [], ['four']);
    case 7: return r('ななひゃく', [], ['seven']);
    case 9: return r('きゅうひゃく', [], ['nine']);
    default: return r(ONES[d].kana + 'ひゃく');
  }
}

function thousands(d: number, inMan = false): Reading {
  switch (d) {
    // 1000万 is いっせんまん; a plain 1000 is せん
    case 1: return inMan ? r('いっせん', ['せん']) : r('せん', [], ['sen-1']);
    case 3: return r('さんぜん', [], ['sen-3']);
    case 8: return r('はっせん', [], ['sen-8']);
    case 4: return r('よんせん', [], ['four']);
    case 7: return r('ななせん', [], ['seven']);
    case 9: return r('きゅうせん', [], ['nine']);
    default: return r(ONES[d].kana + 'せん');
  }
}

/** 1 … 9,999 */
function below10000(n: number, inMan = false): Reading[] {
  const parts: Reading[] = [];
  const t = Math.floor(n / 1000), h = Math.floor((n % 1000) / 100), d = Math.floor((n % 100) / 10), o = n % 10;
  if (t) parts.push(thousands(t, inMan));
  if (h) parts.push(hundreds(h));
  if (d) parts.push(tens(d));
  if (o) parts.push(ONES[o]);
  return parts;
}

/** Reading of a whole number 0 … 99,999,999. */
export function readNumber(n: number): Reading {
  if (!Number.isInteger(n) || n < 0 || n > 99_999_999) throw new Error(`Unsupported number ${n}`);
  if (n === 0) return r('ゼロ', ['れい', 'ぜろ'], ['zero']);
  const man = Math.floor(n / 10000), rest = n % 10000;
  const parts: Reading[] = [];
  if (man) {
    const mp = man === 1 ? [r('いち', [], ['man-1'])] : below10000(man, true);
    parts.push(...mp, r('まん', [], ['man']));
  }
  parts.push(...below10000(rest));
  return join(parts);
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

export function readHour(h: number): Reading {
  if (h === 4) return r('よじ', [], ['ji-4']);
  if (h === 7) return r('しちじ', ['ななじ'], ['ji-7']);
  if (h === 9) return r('くじ', [], ['ji-9']);
  const n = readNumber(h);
  return { kana: n.kana + 'じ', alts: n.alts.filter((a) => !a.endsWith('し')).map((a) => a + 'じ'), rules: [] };
}

const MIN_ONES: Record<number, Reading> = {
  1: r('いっぷん', [], ['pun']), 2: r('にふん'), 3: r('さんぷん', [], ['pun']), 4: r('よんぷん', [], ['pun']),
  5: r('ごふん'), 6: r('ろっぷん', [], ['pun']), 7: r('ななふん', ['しちふん']), 8: r('はっぷん', ['はちふん'], ['pun']),
  9: r('きゅうふん'),
};

export function readMinutes(m: number): Reading {
  if (m < 1 || m > 59) throw new Error(`Unsupported minutes ${m}`);
  const d = Math.floor(m / 10), o = m % 10;
  if (o === 0) {
    const prefix = d === 1 ? '' : tens(d).kana.replace(/じゅう$/, '');
    const base = r(prefix + 'じゅっぷん', [prefix + 'じっぷん'], ['pun']);
    return d === 3 ? { ...base, rules: ['pun'] } : base;
  }
  return join([...(d ? [tens(d)] : []), MIN_ONES[o]]);
}

/** Clock time, e.g. 4:30 → よじ さんじゅっぷん / よじはん. */
export function readTime(h: number, m: number): Reading {
  const hr = readHour(h);
  if (m === 0) return hr;
  const mr = readMinutes(m);
  const joined = join([hr, mr]);
  if (m === 30) {
    const han = join([hr, r('はん')]);
    return { kana: joined.kana, alts: [...joined.alts, han.kana, ...han.alts], rules: [...joined.rules, 'han'] };
  }
  return joined;
}

export const WEEKDAYS: { kana: string; kanji: string; de: string; en: string }[] = [
  { kana: 'げつようび', kanji: '月曜日', de: 'Montag', en: 'Monday' },
  { kana: 'かようび', kanji: '火曜日', de: 'Dienstag', en: 'Tuesday' },
  { kana: 'すいようび', kanji: '水曜日', de: 'Mittwoch', en: 'Wednesday' },
  { kana: 'もくようび', kanji: '木曜日', de: 'Donnerstag', en: 'Thursday' },
  { kana: 'きんようび', kanji: '金曜日', de: 'Freitag', en: 'Friday' },
  { kana: 'どようび', kanji: '土曜日', de: 'Samstag', en: 'Saturday' },
  { kana: 'にちようび', kanji: '日曜日', de: 'Sonntag', en: 'Sunday' },
];

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const DAY_SPECIAL: Record<number, Reading> = {
  1: r('ついたち', [], ['date-special']), 2: r('ふつか', [], ['date-special']), 3: r('みっか', [], ['date-special']),
  4: r('よっか', [], ['date-special']), 5: r('いつか', [], ['date-special']), 6: r('むいか', [], ['date-special']),
  7: r('なのか', [], ['date-special']), 8: r('ようか', [], ['date-special']), 9: r('ここのか', [], ['date-special']),
  10: r('とおか', [], ['date-special']), 14: r('じゅうよっか', [], ['date-14-24']), 20: r('はつか', [], ['date-14-24']),
  24: r('にじゅうよっか', [], ['date-14-24']),
  17: r('じゅうしちにち', ['じゅうななにち']), 19: r('じゅうくにち', ['じゅうきゅうにち']),
  27: r('にじゅうしちにち', ['にじゅうななにち']), 29: r('にじゅうくにち', ['にじゅうきゅうにち']),
};

/** Day of the month (1–31): ついたち, ふつか … */
export function readDay(d: number): Reading {
  if (d < 1 || d > 31) throw new Error(`Unsupported day ${d}`);
  if (DAY_SPECIAL[d]) return DAY_SPECIAL[d];
  const n = readNumber(d);
  return { kana: n.kana + 'にち', alts: [], rules: [] };
}

/** Month (1–12): いちがつ … しがつ, しちがつ, くがつ. */
export function readMonth(m: number): Reading {
  if (m < 1 || m > 12) throw new Error(`Unsupported month ${m}`);
  if (m === 4) return r('しがつ', [], ['gatsu-4']);
  if (m === 7) return r('しちがつ', [], ['gatsu-7']);
  if (m === 9) return r('くがつ', [], ['gatsu-9']);
  return r(readNumber(m).kana + 'がつ');
}

export function readDate(m: number, d: number): Reading {
  return join([readMonth(m), readDay(d)]);
}

/** Years: 〜ねん, with よねん for 4 and しちねん/ななねん, きゅうねん/くねん. */
export function readYear(y: number): Reading {
  const n = readNumber(y);
  const fix = (k: string) => k.replace(/よん$/, 'よ');
  const variants = [n.kana, ...n.alts].filter((k) => !k.endsWith('し')).map((k) => fix(k) + 'ねん');
  const rules: RuleId[] = [...n.rules];
  if (y % 10 === 4) rules.push('nen-4');
  return { kana: variants[0], alts: variants.slice(1), rules };
}

// ---------------------------------------------------------------------------
// Money, phone numbers
// ---------------------------------------------------------------------------

/** Prices: 〜えん; amounts ending in 4 use よえん. */
export function readPrice(yen: number): Reading {
  const n = readNumber(yen);
  const std = [n.kana, ...n.alts.filter((a) => a === n.kana.replace(/なな/g, 'しち'))];
  const variants = std.map((k) => k.replace(/よん$/, 'よ') + 'えん');
  const rules: RuleId[] = [...n.rules];
  if (yen % 10 === 4) rules.push('en-4');
  return { kana: variants[0], alts: variants.slice(1), rules };
}

const DIGIT: Record<string, string> = {
  '0': 'ゼロ', '1': 'いち', '2': 'に', '3': 'さん', '4': 'よん', '5': 'ご', '6': 'ろく', '7': 'なな', '8': 'はち', '9': 'きゅう',
};

/** Phone numbers are read digit by digit, the dash is read の. */
export function readPhone(phone: string): Reading {
  const kana = [...phone].map((c) => (c === '-' ? 'の' : DIGIT[c] ?? '')).join('');
  return { kana, alts: [kana.replace(/ゼロ/g, 'れい')], rules: [] };
}

// ---------------------------------------------------------------------------
// Counters
// ---------------------------------------------------------------------------

export type Counter = 'tsu' | 'nin' | 'mai' | 'hon' | 'sai' | 'kai';

export const COUNTERS: Record<Counter, { suffix: string; kanji: string; de: string; en: string; max: number }> = {
  tsu: { suffix: 'つ', kanji: 'つ', de: 'Dinge allgemein', en: 'general things', max: 10 },
  nin: { suffix: 'にん', kanji: '人', de: 'Personen', en: 'people', max: 10 },
  mai: { suffix: 'まい', kanji: '枚', de: 'flache Dinge (Papier, Hemden)', en: 'flat things (paper, shirts)', max: 10 },
  hon: { suffix: 'ほん', kanji: '本', de: 'lange, dünne Dinge (Stifte, Flaschen)', en: 'long thin things (pens, bottles)', max: 10 },
  sai: { suffix: 'さい', kanji: '歳', de: 'Alter (Jahre)', en: 'age (years old)', max: 99 },
  kai: { suffix: 'かい', kanji: '階', de: 'Stockwerk', en: 'floor (storey)', max: 10 },
};

const TSU = ['', 'ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ', 'むっつ', 'ななつ', 'やっつ', 'ここのつ', 'とお'];
const NIN: Record<number, Reading> = {
  1: r('ひとり', [], ['nin']), 2: r('ふたり', [], ['nin']), 4: r('よにん', [], ['nin']),
  7: r('ななにん', ['しちにん'], ['nin']), 9: r('きゅうにん', ['くにん'], ['nin']),
};
const HON: Record<number, Reading> = {
  1: r('いっぽん', [], ['hon']), 2: r('にほん', [], ['hon']), 3: r('さんぼん', [], ['hon']), 4: r('よんほん', [], ['hon']),
  5: r('ごほん', [], ['hon']), 6: r('ろっぽん', [], ['hon']), 7: r('ななほん', [], ['hon']), 8: r('はっぽん', ['はちほん'], ['hon']),
  9: r('きゅうほん', [], ['hon']), 10: r('じゅっぽん', ['じっぽん'], ['hon']),
};
const KAI: Record<number, Reading> = {
  1: r('いっかい', [], ['kai']), 3: r('さんがい', ['さんかい'], ['kai']), 6: r('ろっかい', [], ['kai']),
  8: r('はっかい', ['はちかい'], ['kai']), 10: r('じゅっかい', ['じっかい'], ['kai']),
};

export function readCounter(n: number, counter: Counter): Reading {
  switch (counter) {
    case 'tsu':
      if (n < 1 || n > 10) throw new Error('〜つ only goes to 10');
      return r(TSU[n], [], ['tsu']);
    case 'nin':
      if (NIN[n]) return NIN[n];
      return withSuffix(readNumber(n), 'にん', ['nin']);
    case 'mai':
      return withSuffix(readNumber(n), 'まい');
    case 'hon':
      if (HON[n]) return HON[n];
      throw new Error('〜ほん is drilled for 1–10');
    case 'kai':
      if (KAI[n]) return KAI[n];
      return withSuffix(readNumber(n), 'かい');
    case 'sai':
      return readAge(n);
  }
}

function withSuffix(n: Reading, suffix: string, rules: RuleId[] = []): Reading {
  // counters use the standard readings (よん, きゅう) – only なな/しち may vary
  const v = [n.kana, ...n.alts.filter((a) => a === n.kana.replace(/なな/g, 'しち'))];
  return { kana: v[0] + suffix, alts: v.slice(1).map((k) => k + suffix), rules: [...n.rules, ...rules] };
}

/** Age: いっさい, はっさい, じゅっさい, はたち … */
export function readAge(n: number): Reading {
  if (n < 1 || n > 99) throw new Error(`Unsupported age ${n}`);
  if (n === 20) return r('はたち', ['にじゅっさい', 'にじっさい'], ['hatachi']);
  const d = Math.floor(n / 10), o = n % 10;
  const tensPart = d ? [tens(d)] : [];
  let last: Reading;
  if (o === 0) {
    const prefix = d === 1 ? '' : tens(d).kana.replace(/じゅう$/, '');
    return r(prefix + 'じゅっさい', [prefix + 'じっさい'], ['sai']);
  }
  if (o === 1) last = r('いっさい', [], ['sai']);
  else if (o === 8) last = r('はっさい', [], ['sai']);
  else if (o === 4) last = r('よんさい');
  else if (o === 7) last = r('ななさい');
  else if (o === 9) last = r('きゅうさい');
  else last = r(ONES[o].kana + 'さい');
  return join([...tensPart, last]);
}
