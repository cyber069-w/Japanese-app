/**
 * Number drill categories. Each one generates a random instance per question,
 * so the SRS tracks how well you know the *category* (e.g. "hundreds").
 */
import type { BaseItem } from '../../core/types';
import {
  COUNTERS, WEEKDAYS, readAge, readCounter, readDate, readDay, readHour, readMinutes, readMonth, readNumber, readPhone,
  readPrice, readTime, readYear, type Counter, type Reading,
} from './readings';

export type Direction = 'read' | 'write' | 'listen';

export interface Instance extends Reading {
  /** What is shown, e.g. "300", "4:30", "3月14日" */
  display: string;
  displayLang: 'ja' | 'latin';
  /** Small explanation under the prompt, e.g. "(people)" */
  sub?: string;
  /** Number answer for write/listen, already normalised (see normalizeAnswer) */
  answer: string;
  /** How to type the answer (shown as placeholder) */
  answerFormat?: string;
  /** Place-value breakdown for hints, e.g. "3000 + 600 + 80 + 1" */
  parts?: string;
  clock?: { h: number; m: number };
}

export interface NumberCategory extends BaseItem {
  directions: Direction[];
  gen: (rng: () => number) => Instance;
}

const int = (rng: () => number, a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
const pick = <T,>(rng: () => number, arr: T[]) => arr[Math.floor(rng() * arr.length)];
const fmt = (n: number) => n.toLocaleString('en-US');

function parts(n: number): string {
  const p: number[] = [];
  let unit = 1;
  let rest = n;
  while (rest > 0) {
    const d = rest % 10;
    if (d) p.unshift(d * unit);
    rest = Math.floor(rest / 10);
    unit *= 10;
  }
  return p.length > 1 ? p.map(fmt).join(' + ') : '';
}

function numberInstance(n: number): Instance {
  return { ...readNumber(n), display: fmt(n), displayLang: 'latin', answer: String(n), parts: parts(n) };
}

/** Normalise a typed number answer: "1,500円" → "1500", "4.30" → "4:30", "14.3." → "3/14". */
export function normalizeAnswer(raw: string, format: 'number' | 'time' | 'date' | 'phone' = 'number'): string {
  const s = raw.normalize('NFKC').trim().replace(/[¥円\s]/g, '');
  if (format === 'time') {
    const m = /^(\d{1,2})[:.h](\d{2})$/.exec(s) ?? /^(\d{1,2})(\d{2})$/.exec(s);
    if (m) return `${Number(m[1])}:${m[2]}`;
    return /^\d{1,2}$/.test(s) ? `${Number(s)}:00` : s;
  }
  if (format === 'date') {
    let m = /^(\d{1,2})\/(\d{1,2})$/.exec(s);
    if (m) return `${Number(m[1])}/${Number(m[2])}`;
    m = /^(\d{1,2})\.(\d{1,2})\.?$/.exec(s); // German style day.month.
    if (m) return `${Number(m[2])}/${Number(m[1])}`;
    m = /^(\d{1,2})月(\d{1,2})日?$/.exec(s);
    if (m) return `${Number(m[1])}/${Number(m[2])}`;
    return s;
  }
  if (format === 'phone') return s.replace(/[^\d]/g, '');
  return s.replace(/[,.'’]/g, '').replace(/^0+(?=\d)/, '');
}

export const answerFormatOf = (c: { id: string }): 'number' | 'time' | 'date' | 'phone' =>
  c.id === 'times' || c.id === 'hours' ? 'time' : c.id === 'dates' ? 'date' : c.id === 'phone' ? 'phone' : 'number';

const counterCat = (id: Counter, label: string): NumberCategory => {
  const c = COUNTERS[id];
  return {
    id: `c-${id}`,
    label,
    sub: c.en,
    groups: [`c-${id}`],
    directions: ['read', 'write', 'listen'],
    gen: (rng) => {
      const n = id === 'sai' ? pick(rng, [int(rng, 1, 10), int(rng, 11, 30), 20, 18, 21, 8, 1, 10]) : int(rng, 1, c.max);
      const r = id === 'sai' ? readAge(n) : readCounter(n, id);
      return { ...r, display: `${n}${c.kanji}`, displayLang: 'ja', sub: `${c.de} · ${c.en}`, answer: String(n) };
    },
  };
};

export const CATEGORIES: NumberCategory[] = [
  // ----- numbers -----
  {
    id: 'n1-10', label: '0–10', sub: 'いち, に, さん …', groups: ['n1-10'], directions: ['read', 'write', 'listen'],
    gen: (rng) => numberInstance(int(rng, 0, 10)),
  },
  {
    id: 'n11-99', label: '11–99', sub: 'じゅう + …', groups: ['n11-99'], directions: ['read', 'write', 'listen'],
    gen: (rng) => numberInstance(int(rng, 11, 99)),
  },
  {
    id: 'n100', label: '100–999', sub: 'ひゃく, びゃく, ぴゃく', groups: ['n100'], directions: ['read', 'write', 'listen'],
    gen: (rng) => {
      // favour the irregular hundreds
      const h = rng() < 0.5 ? pick(rng, [1, 3, 6, 8]) : int(rng, 1, 9);
      return numberInstance(h * 100 + (rng() < 0.3 ? 0 : int(rng, 0, 99)));
    },
  },
  {
    id: 'n1000', label: '1,000–9,999', sub: 'せん, ぜん', groups: ['n1000'], directions: ['read', 'write', 'listen'],
    gen: (rng) => {
      const t = rng() < 0.5 ? pick(rng, [1, 3, 8]) : int(rng, 1, 9);
      const rest = rng() < 0.25 ? 0 : rng() < 0.5 ? pick(rng, [100, 300, 600, 800]) + int(rng, 0, 99) : int(rng, 0, 999);
      return numberInstance(t * 1000 + rest);
    },
  },
  {
    id: 'n10000', label: '1–10,000 mixed', sub: 'all together', groups: ['n10000'], directions: ['read', 'write', 'listen'],
    gen: (rng) => {
      const mag = int(rng, 0, 4);
      const n = mag === 4 ? 10000 : mag === 0 ? int(rng, 1, 9) : int(rng, 10 ** mag, 10 ** (mag + 1) - 1);
      return numberInstance(n);
    },
  },
  {
    id: 'special', label: 'Sound changes', sub: '300, 600, 800, 3000 …', groups: ['special'], directions: ['read', 'write', 'listen'],
    gen: (rng) =>
      numberInstance(
        pick(rng, [100, 300, 600, 800, 1000, 3000, 8000, 10000, 4, 7, 9, 14, 17, 19, 40, 70, 90, 400, 700, 900, 4000, 7000, 9000,
          340, 680, 3800, 8600, 6300, 1600, 3300, 8800, 1800, 6800, 3600, 8300]),
      ),
  },
  {
    id: 'nbig', label: '10,000–100,000', sub: 'まん', groups: ['nbig'], directions: ['read', 'write', 'listen'],
    gen: (rng) => numberInstance(rng() < 0.15 ? 100000 : int(rng, 1, 9) * 10000 + (rng() < 0.4 ? int(rng, 0, 9) * 1000 : int(rng, 0, 9999))),
  },
  // ----- time -----
  {
    id: 'hours', label: 'Hours', sub: '〜じ', groups: ['hours'], directions: ['read', 'write', 'listen'],
    gen: (rng) => {
      const h = rng() < 0.45 ? pick(rng, [4, 7, 9]) : int(rng, 1, 12);
      return { ...readHour(h), display: `${h}時`, displayLang: 'ja', sub: `${h}:00`, answer: `${h}:00`, answerFormat: 'h:mm', clock: { h, m: 0 } };
    },
  },
  {
    id: 'minutes', label: 'Minutes', sub: '〜ふん / ぷん', groups: ['minutes'], directions: ['read', 'write', 'listen'],
    gen: (rng) => {
      const m = rng() < 0.5 ? pick(rng, [1, 3, 4, 6, 8, 10, 20, 30, 40]) : int(rng, 1, 59);
      return { ...readMinutes(m), display: `${m}分`, displayLang: 'ja', sub: `${m} min`, answer: String(m) };
    },
  },
  {
    id: 'times', label: 'Clock times', sub: '4:30 = よじはん', groups: ['times'], directions: ['read', 'write', 'listen'],
    gen: (rng) => {
      const h = int(rng, 1, 12);
      const m = pick(rng, [0, 5, 10, 15, 20, 30, 30, 45, 50, int(rng, 1, 59)]);
      return {
        ...readTime(h, m), display: `${h}:${String(m).padStart(2, '0')}`, displayLang: 'latin', answer: `${h}:${String(m).padStart(2, '0')}`,
        answerFormat: 'h:mm', clock: { h, m },
      };
    },
  },
  // ----- dates -----
  {
    id: 'weekdays', label: 'Days of the week', sub: 'げつようび …', groups: ['weekdays'], directions: ['read'],
    gen: (rng) => {
      const d = pick(rng, WEEKDAYS);
      return { kana: d.kana, alts: [], rules: [], display: d.kanji, displayLang: 'ja', sub: `${d.de} · ${d.en}`, answer: '' };
    },
  },
  {
    id: 'days', label: 'Day of the month', sub: 'ついたち, ふつか …', groups: ['days'], directions: ['read', 'write', 'listen'],
    gen: (rng) => {
      const d = rng() < 0.6 ? pick(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 20, 24]) : int(rng, 1, 31);
      return { ...readDay(d), display: `${d}日`, displayLang: 'ja', sub: 'day of the month', answer: String(d) };
    },
  },
  {
    id: 'months', label: 'Months', sub: 'しがつ, しちがつ, くがつ', groups: ['months'], directions: ['read', 'write', 'listen'],
    gen: (rng) => {
      const m = rng() < 0.4 ? pick(rng, [4, 7, 9]) : int(rng, 1, 12);
      return { ...readMonth(m), display: `${m}月`, displayLang: 'ja', sub: new Date(2026, m - 1, 1).toLocaleString('de-DE', { month: 'long' }), answer: String(m) };
    },
  },
  {
    id: 'dates', label: 'Full dates', sub: '3月14日', groups: ['dates'], directions: ['read', 'write', 'listen'],
    gen: (rng) => {
      const m = int(rng, 1, 12);
      const d = rng() < 0.5 ? pick(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 20, 24]) : int(rng, 1, 28);
      return { ...readDate(m, d), display: `${m}月${d}日`, displayLang: 'ja', answer: `${m}/${d}`, answerFormat: 'month/day, e.g. 3/14' };
    },
  },
  {
    id: 'years', label: 'Years', sub: '〜ねん', groups: ['years'], directions: ['read', 'write', 'listen'],
    gen: (rng) => {
      const y = rng() < 0.3 ? pick(rng, [2024, 2004, 1994, 2014]) : int(rng, 1985, 2030);
      return { ...readYear(y), display: `${y}年`, displayLang: 'ja', answer: String(y), parts: parts(y) };
    },
  },
  // ----- money & phone -----
  {
    id: 'prices', label: 'Prices', sub: '〜えん', groups: ['prices'], directions: ['read', 'write', 'listen'],
    gen: (rng) => {
      const n = pick(rng, [
        int(rng, 1, 99) * 10, int(rng, 1, 99) * 100, int(rng, 1, 9) * 1000 + int(rng, 0, 9) * 100, int(rng, 1, 9) * 100 + 4,
        int(rng, 100, 9999), pick(rng, [4, 14, 104, 304, 1004]), 10000, int(rng, 2, 9) * 10000,
      ]);
      return { ...readPrice(n), display: `${fmt(n)}円`, displayLang: 'ja', answer: String(n), parts: parts(n) };
    },
  },
  {
    id: 'phone', label: 'Phone numbers', sub: 'ゼロ, の', groups: ['phone'], directions: ['write', 'listen'],
    gen: (rng) => {
      const area = pick(rng, ['03', '06', '045', '075', '090', '080']);
      const num = `${area}-${int(rng, 1000, 9999)}-${int(rng, 1000, 9999)}`;
      return { ...readPhone(num), display: num, displayLang: 'latin', answer: num.replace(/-/g, ''), answerFormat: 'digits, dashes optional' };
    },
  },
  // ----- counters -----
  counterCat('tsu', '〜つ things'),
  counterCat('nin', '〜人 people'),
  counterCat('mai', '〜枚 flat things'),
  counterCat('hon', '〜本 long things'),
  counterCat('sai', '〜歳 age'),
  counterCat('kai', '〜階 floors'),
];

export const SECTIONS: Record<string, string[]> = {
  'Numbers': ['n1-10', 'n11-99', 'n100', 'n1000', 'n10000', 'special', 'nbig'],
  'Time': ['hours', 'minutes', 'times'],
  'Dates': ['weekdays', 'days', 'months', 'dates', 'years'],
  'Money & phone': ['prices', 'phone'],
  'Counters': ['c-tsu', 'c-nin', 'c-mai', 'c-hon', 'c-sai', 'c-kai'],
};
