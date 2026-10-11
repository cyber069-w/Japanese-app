/**
 * Turns the self-introduction form into Japanese sentences (grammar notation,
 * see grammar/sentence.ts) with German and English translations.
 */
import type { Meaning, Profile } from '../../core/types';
import { nameToKatakana } from '../../lib/katakanaName';
import { readAge, readDate } from '../numbers/readings';
import { COUNTRIES, HOBBIES, MAJORS, YEARS, type Hobby, type Year } from './data';

export interface Line extends Meaning { id: string; ja: string }

export const EMPTY_PROFILE: Profile = {
  name: '', nameJa: '', country: '', countryOther: '', countryOtherJa: '', university: '', universityJa: '',
  year: '', major: '', majorOtherJa: '', majorOtherDe: '', age: null, birthday: '', hobbies: [], edited: [],
};

/** Used for example answers until you fill in your own introduction. */
export const SAMPLE_PROFILE: Profile = {
  ...EMPTY_PROFILE,
  name: 'Anna', nameJa: 'アンナ', country: 'de', university: 'Heidelberg', universityJa: 'ハイデルベルク', year: '2',
  major: 'econ', age: 21, birthday: '05-10', hobbies: ['reading', 'travel'],
};

export type Field = 'name' | 'country' | 'uni' | 'major' | 'year' | 'age' | 'birthday' | 'hobbies';

const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** User text can't contain the notation's brackets, and spaces would split it into tiles. */
const clean = (s: string) => s.replace(/[[\]{}]/g, '').replace(/\s+/g, '');

const LANG_NAMES: Record<string, Meaning> = {
  'ドイツ語[ご]': { de: 'Deutsch', en: 'German' }, 'イタリア語[ご]': { de: 'Italienisch', en: 'Italian' },
  'フランス語[ご]': { de: 'Französisch', en: 'French' }, 'スペイン語[ご]': { de: 'Spanisch', en: 'Spanish' },
  'ポルトガル語[ご]': { de: 'Portugiesisch', en: 'Portuguese' }, 'オランダ語[ご]': { de: 'Niederländisch', en: 'Dutch' },
  '英語[えいご]': { de: 'Englisch', en: 'English' }, 'ポーランド語[ご]': { de: 'Polnisch', en: 'Polish' },
  'チェコ語[ご]': { de: 'Tschechisch', en: 'Czech' }, 'ハンガリー語[ご]': { de: 'Ungarisch', en: 'Hungarian' },
  'クロアチア語[ご]': { de: 'Kroatisch', en: 'Croatian' }, 'セルビア語[ご]': { de: 'Serbisch', en: 'Serbian' },
  'ルーマニア語[ご]': { de: 'Rumänisch', en: 'Romanian' }, 'ギリシャ語[ご]': { de: 'Griechisch', en: 'Greek' },
  'トルコ語[ご]': { de: 'Türkisch', en: 'Turkish' }, 'スウェーデン語[ご]': { de: 'Schwedisch', en: 'Swedish' },
  'ノルウェー語[ご]': { de: 'Norwegisch', en: 'Norwegian' }, 'デンマーク語[ご]': { de: 'Dänisch', en: 'Danish' },
  'フィンランド語[ご]': { de: 'Finnisch', en: 'Finnish' }, 'ウクライナ語[ご]': { de: 'Ukrainisch', en: 'Ukrainian' },
  'ロシア語[ご]': { de: 'Russisch', en: 'Russian' }, '中国語[ちゅうごくご]': { de: 'Chinesisch', en: 'Chinese' },
  '韓国語[かんこくご]': { de: 'Koreanisch', en: 'Korean' }, '日本語[にほんご]': { de: 'Japanisch', en: 'Japanese' },
  'ヒンディー語[ご]': { de: 'Hindi', en: 'Hindi' }, 'タイ語[ご]': { de: 'Thai', en: 'Thai' },
  'ベトナム語[ご]': { de: 'Vietnamesisch', en: 'Vietnamese' }, 'インドネシア語[ご]': { de: 'Indonesisch', en: 'Indonesian' },
};

/** Everything the sentences need, with the sample filling the gaps (listed in `missing`). */
export interface Resolved {
  name: { ja: string; latin: string };
  country: { id: string; ja: string; from: Meaning; lang: string; langName: Meaning } & Meaning;
  /** University name with 大学, and the city on its own (for うちはどこですか). */
  uni: { ja: string; city: string; latin: string };
  major: { ja: string } & Meaning;
  year: Year | null;
  age: { ja: string; n: number };
  birthday: { ja: string } & Meaning;
  hobbies: Hobby[];
  missing: Set<Field>;
}

function pick(p: Profile | null): Profile {
  return p ?? SAMPLE_PROFILE;
}

export function resolve(profile: Profile | null): Resolved {
  const p = pick(profile);
  const s = SAMPLE_PROFILE;
  const missing = new Set<Field>();
  const use = <T,>(field: Field, mine: T | null | undefined | false, sample: T): T => {
    if (mine !== null && mine !== undefined && mine !== false) return mine;
    missing.add(field);
    return sample;
  };

  // name
  const nameJa = clean(p.nameJa || nameToKatakana(p.name));
  const name = use('name', nameJa ? { ja: nameJa, latin: p.name.trim() || nameJa } : null, { ja: s.nameJa, latin: s.name });

  // country
  const listed = COUNTRIES.find((x) => x.id === p.country);
  const otherJa = clean(p.countryOtherJa || nameToKatakana(p.countryOther));
  const countryOf = (x: (typeof COUNTRIES)[number]) => ({ id: x.id, ja: x.ja, de: x.de, en: x.en, from: x.from, lang: x.lang, langName: LANG_NAMES[x.lang] });
  const country = use(
    'country',
    listed
      ? countryOf(listed)
      : p.country === 'other' && otherJa
        ? { id: 'other', ja: otherJa, de: p.countryOther || otherJa, en: p.countryOther || otherJa, from: { de: `aus ${p.countryOther}`, en: `from ${p.countryOther}` }, lang: '英語[えいご]', langName: LANG_NAMES['英語[えいご]'] }
        : null,
    countryOf(COUNTRIES.find((x) => x.id === s.country)!),
  );

  // university
  const uniRaw = clean(p.universityJa || nameToKatakana(p.university));
  const uniOf = (ja: string, latin: string) => {
    const city = ja.replace(/大学$/, '');
    return { ja: `${city}大学[だいがく]`, city, latin: (latin || city).replace(/^(universit(y|ät)|uni)\s+(of\s+)?/i, '') };
  };
  const uni = use('uni', uniRaw ? uniOf(uniRaw, p.university.trim()) : null, uniOf(s.universityJa, s.university));

  // major
  const listedMajor = MAJORS.find((x) => x.id === p.major);
  const otherMajor = clean(p.majorOtherJa);
  const major = use(
    'major',
    listedMajor ?? (p.major === 'other' && otherMajor ? { ja: otherMajor, de: p.majorOtherDe || otherMajor, en: p.majorOtherDe || otherMajor } : null),
    MAJORS.find((x) => x.id === s.major)!,
  );

  const year = profile ? YEARS.find((x) => x.id === p.year) ?? null : YEARS.find((x) => x.id === s.year)!;
  if (!year && profile) missing.add('year');

  const ageOf = (n: number) => ({ ja: `${n}歳[${readAge(n).kana}]`, n });
  const age = use('age', typeof p.age === 'number' && p.age >= 1 && p.age <= 99 ? ageOf(Math.round(p.age)) : null, ageOf(s.age!));

  const bdayOf = (mmdd: string) => {
    const [m, d] = mmdd.split('-').map(Number);
    if (!m || !d || m > 12 || d > 31) return null;
    return { ja: `${m}月${d}日[${readDate(m, d).kana}]`, de: `am ${d}. ${MONTHS_DE[m - 1]}`, en: `on ${MONTHS_EN[m - 1]} ${d}` };
  };
  const birthday = use('birthday', bdayOf(p.birthday), bdayOf(s.birthday)!);

  const known = p.hobbies.map((id) => HOBBIES.find((x) => x.id === id)).filter((x): x is Hobby => !!x);
  const hobbies = use('hobbies', known.length ? known : null, s.hobbies.map((id) => HOBBIES.find((x) => x.id === id)!));

  if (!profile) (['name', 'country', 'uni', 'major', 'age', 'birthday', 'hobbies'] as Field[]).forEach((f) => missing.add(f));
  return { name, country, uni, major, year, age, birthday, hobbies, missing };
}

/** "A", "A and B", "A, B and C" */
export function listJoin(items: string[], and: string): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;
}

/** Hobbies in Japanese: 読書と 旅行 */
export const hobbiesJa = (hs: Hobby[]) => hs.map((x) => x.ja).join('{と} ');

export function hobbiesSentence(hs: Hobby[]): Line {
  const one = hs.length === 1;
  return {
    id: 'hobby',
    ja: `趣味[しゅみ]{は} ${hobbiesJa(hs)}です。`,
    de: `${one ? 'Mein Hobby ist' : 'Meine Hobbys sind'} ${listJoin(hs.map((x) => x.de), 'und')}.`,
    en: `${one ? 'My hobby is' : 'My hobbies are'} ${listJoin(hs.map((x) => x.en), 'and')}.`,
  };
}

/**
 * The self-introduction, line by line. Optional parts (age, year, hobbies) only
 * appear when they are filled in.
 */
export function introLines(profile: Profile): Line[] {
  const r = resolve(profile);
  const has = (f: Field) => !r.missing.has(f);
  const lines: Line[] = [{ id: 'greet', ja: 'はじめまして。', de: 'Freut mich, Sie kennenzulernen.', en: 'Nice to meet you.' }];
  if (has('name')) lines.push({ id: 'name', ja: `私[わたし]{は} ${r.name.ja}です。`, de: `Ich bin ${r.name.latin}.`, en: `I’m ${r.name.latin}.` });
  if (has('age')) lines.push({ id: 'age', ja: `${r.age.ja}です。`, de: `Ich bin ${r.age.n} Jahre alt.`, en: `I’m ${r.age.n} years old.` });
  if (has('country')) {
    lines.push({ id: 'country', ja: `${r.country.ja}{から} 来[き]ました。`, de: `Ich komme ${r.country.from.de}.`, en: `I’m ${r.country.from.en}.` });
  }
  if (has('uni')) {
    lines.push(
      r.year
        ? { id: 'uni', ja: `${r.uni.ja}{の} ${r.year.ja}です。`, de: `Ich bin ${r.year.de} an der Universität ${r.uni.latin}.`, en: `I’m ${r.year.en} at the University of ${r.uni.latin}.` }
        : { id: 'uni', ja: `${r.uni.ja}{の} 学生[がくせい]です。`, de: `Ich studiere an der Universität ${r.uni.latin}.`, en: `I’m a student at the University of ${r.uni.latin}.` },
    );
  }
  if (has('major')) lines.push({ id: 'major', ja: `専攻[せんこう]{は} ${r.major.ja}です。`, de: `Mein Studienfach ist ${r.major.de}.`, en: `My major is ${r.major.en}.` });
  if (has('hobbies')) lines.push(hobbiesSentence(r.hobbies));
  lines.push({ id: 'close', ja: 'どうぞ よろしく お願[ねが]いします。', de: 'Sehr erfreut.', en: 'Pleased to meet you.' });
  return lines;
}

/** Nothing filled in at all. */
export function isBlank(p: Profile): boolean {
  return !p.name.trim() && !p.nameJa && !p.country && !p.university.trim() && !p.universityJa && !p.major && !p.year && !p.age && !p.birthday && !p.hobbies.length;
}

/** Enough filled in for a real introduction (name, country, university, major). */
export function isComplete(p: Profile | null): boolean {
  if (!p) return false;
  const r = resolve(p);
  return !(['name', 'country', 'uni', 'major'] as Field[]).some((f) => r.missing.has(f));
}
