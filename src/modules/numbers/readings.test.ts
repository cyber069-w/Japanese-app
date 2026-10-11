import { describe, expect, it } from 'vitest';
import {
  readAge, readCounter, readDate, readDay, readHour, readMinutes, readMonth, readNumber, readPhone, readPrice, readTime, readYear,
} from './readings';

const all = (x: { kana: string; alts: string[] }) => [x.kana, ...x.alts];

describe('numbers 1–10,000', () => {
  it('reads the basics', () => {
    expect(readNumber(1).kana).toBe('いち');
    expect(readNumber(4).kana).toBe('よん');
    expect(all(readNumber(4))).toContain('し');
    expect(readNumber(7).kana).toBe('なな');
    expect(all(readNumber(7))).toContain('しち');
    expect(readNumber(9).kana).toBe('きゅう');
    expect(readNumber(10).kana).toBe('じゅう');
    expect(readNumber(11).kana).toBe('じゅういち');
    expect(readNumber(14).kana).toBe('じゅうよん');
    expect(readNumber(20).kana).toBe('にじゅう');
    expect(readNumber(40).kana).toBe('よんじゅう');
    expect(readNumber(99).kana).toBe('きゅうじゅうきゅう');
  });
  it('applies the hundreds sound changes', () => {
    expect(readNumber(100).kana).toBe('ひゃく');
    expect(readNumber(300).kana).toBe('さんびゃく');
    expect(readNumber(600).kana).toBe('ろっぴゃく');
    expect(readNumber(800).kana).toBe('はっぴゃく');
    expect(readNumber(400).kana).toBe('よんひゃく');
    expect(readNumber(700).kana).toBe('ななひゃく');
    expect(readNumber(900).kana).toBe('きゅうひゃく');
    expect(readNumber(300).rules).toContain('hyaku-3');
  });
  it('applies the thousands sound changes', () => {
    expect(readNumber(1000).kana).toBe('せん');
    expect(readNumber(3000).kana).toBe('さんぜん');
    expect(readNumber(8000).kana).toBe('はっせん');
    expect(readNumber(4000).kana).toBe('よんせん');
    expect(readNumber(9000).kana).toBe('きゅうせん');
  });
  it('reads 10,000 and up with まん', () => {
    expect(readNumber(10000).kana).toBe('いちまん');
    expect(readNumber(25000).kana).toBe('にまんごせん');
    expect(readNumber(100000).kana).toBe('じゅうまん');
    expect(readNumber(10000000).kana).toBe('いっせんまん');
  });
  it('combines everything', () => {
    expect(readNumber(1984).kana).toBe('せんきゅうひゃくはちじゅうよん');
    expect(readNumber(3681).kana).toBe('さんぜんろっぴゃくはちじゅういち');
    expect(readNumber(8888).kana).toBe('はっせんはっぴゃくはちじゅうはち');
    expect(readNumber(2026).kana).toBe('にせんにじゅうろく');
    expect(readNumber(7777).alts).toContain('ななせんななひゃくしちじゅうしち');
    expect(readNumber(0).kana).toBe('ゼロ');
  });
});

describe('time', () => {
  it('reads hours', () => {
    expect(readHour(4).kana).toBe('よじ');
    expect(readHour(7).kana).toBe('しちじ');
    expect(readHour(9).kana).toBe('くじ');
    expect(readHour(12).kana).toBe('じゅうにじ');
  });
  it('reads minutes with ふん/ぷん', () => {
    expect(readMinutes(1).kana).toBe('いっぷん');
    expect(readMinutes(2).kana).toBe('にふん');
    expect(readMinutes(3).kana).toBe('さんぷん');
    expect(readMinutes(4).kana).toBe('よんぷん');
    expect(readMinutes(6).kana).toBe('ろっぷん');
    expect(readMinutes(8).kana).toBe('はっぷん');
    expect(readMinutes(10).kana).toBe('じゅっぷん');
    expect(all(readMinutes(10))).toContain('じっぷん');
    expect(readMinutes(15).kana).toBe('じゅうごふん');
    expect(readMinutes(30).kana).toBe('さんじゅっぷん');
    expect(readMinutes(45).kana).toBe('よんじゅうごふん');
  });
  it('accepts はん for half past', () => {
    expect(readTime(4, 30).kana).toBe('よじさんじゅっぷん');
    expect(all(readTime(4, 30))).toContain('よじはん');
    expect(readTime(9, 0).kana).toBe('くじ');
  });
});

describe('dates', () => {
  it('reads the special days', () => {
    const expected = ['ついたち', 'ふつか', 'みっか', 'よっか', 'いつか', 'むいか', 'なのか', 'ようか', 'ここのか', 'とおか'];
    expected.forEach((k, i) => expect(readDay(i + 1).kana).toBe(k));
    expect(readDay(14).kana).toBe('じゅうよっか');
    expect(readDay(20).kana).toBe('はつか');
    expect(readDay(24).kana).toBe('にじゅうよっか');
    expect(readDay(11).kana).toBe('じゅういちにち');
    expect(readDay(31).kana).toBe('さんじゅういちにち');
  });
  it('reads months', () => {
    expect(readMonth(4).kana).toBe('しがつ');
    expect(readMonth(7).kana).toBe('しちがつ');
    expect(readMonth(9).kana).toBe('くがつ');
    expect(readMonth(12).kana).toBe('じゅうにがつ');
    expect(readDate(3, 14).kana).toBe('さんがつじゅうよっか');
  });
  it('reads years', () => {
    expect(readYear(2026).kana).toBe('にせんにじゅうろくねん');
    expect(readYear(2024).kana).toBe('にせんにじゅうよねん');
    expect(readYear(4).kana).toBe('よねん');
  });
});

describe('money, phone, counters', () => {
  it('reads prices', () => {
    expect(readPrice(4).kana).toBe('よえん');
    expect(readPrice(14).kana).toBe('じゅうよえん');
    expect(readPrice(40).kana).toBe('よんじゅうえん');
    expect(readPrice(300).kana).toBe('さんびゃくえん');
    expect(readPrice(1500).kana).toBe('せんごひゃくえん');
  });
  it('reads phone numbers', () => {
    expect(readPhone('03-1234').kana).toBe('ゼロさんのいちにさんよん');
    expect(readPhone('03-1234').alts).toContain('れいさんのいちにさんよん');
  });
  it('reads counters', () => {
    expect(readCounter(3, 'tsu').kana).toBe('みっつ');
    expect(readCounter(10, 'tsu').kana).toBe('とお');
    expect(readCounter(1, 'nin').kana).toBe('ひとり');
    expect(readCounter(2, 'nin').kana).toBe('ふたり');
    expect(readCounter(4, 'nin').kana).toBe('よにん');
    expect(readCounter(3, 'nin').kana).toBe('さんにん');
    expect(readCounter(3, 'hon').kana).toBe('さんぼん');
    expect(readCounter(6, 'hon').kana).toBe('ろっぽん');
    expect(readCounter(4, 'mai').kana).toBe('よんまい');
    expect(readCounter(3, 'kai').kana).toBe('さんがい');
    expect(readCounter(5, 'kai').kana).toBe('ごかい');
  });
  it('reads ages', () => {
    expect(readAge(1).kana).toBe('いっさい');
    expect(readAge(8).kana).toBe('はっさい');
    expect(readAge(10).kana).toBe('じゅっさい');
    expect(readAge(20).kana).toBe('はたち');
    expect(readAge(21).kana).toBe('にじゅういっさい');
    expect(readAge(18).kana).toBe('じゅうはっさい');
    expect(readAge(30).kana).toBe('さんじゅっさい');
    expect(readAge(24).kana).toBe('にじゅうよんさい');
  });
});

describe('counter variants', () => {
  it('does not accept し / く forms with counters and prices', () => {
    expect(all(readCounter(9, 'mai'))).toEqual(['きゅうまい']);
    expect(all(readCounter(4, 'mai'))).toEqual(['よんまい']);
    expect(all(readCounter(7, 'mai'))).toContain('しちまい');
    expect(all(readPrice(9))).toEqual(['きゅうえん']);
  });
});
