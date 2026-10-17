/**
 * Minimal CSV parser + vocab list import.
 * Handles quotes, "" escapes, CRLF and comma / semicolon / tab separators
 * (German Excel exports use semicolons). Only imports romaji.ts (itself import-free) – also used by the Node build scripts.
 */
import { toKana, toKatakana } from './romaji.ts';

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const counts = { ',': 0, ';': 0, '\t': 0 } as Record<string, number>;
  let inQ = false;
  for (const ch of firstLine) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch]++;
  }
  const sep = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows.map((r) => r.map((f) => f.trim()));
}

export interface VocabRow {
  id: string;
  kana: string;
  kanji?: string;
  de: string;
  en: string;
  lesson: number;
  source: string;
  tags?: string[];
  /** Position in the source list (0-based) – the word list always shows this order. */
  pos: number;
}

/** One romaji word → kana. A capital first letter means katakana (loanwords, names); macron vowels (ō, ū …) are long vowels. */
export function romajiToKana(word: string): string {
  const w = word.trim().replace(/\.\.\.|…/g, '~');
  const katakana = /^[A-Z]/.test(w);
  const lower = w.toLowerCase();
  const plain = katakana
    ? lower.replace(/[āīūēōâîûêô]/g, (c) => c.normalize('NFD')[0] + '-').replace(/([aiueo])\1/g, '$1-')
    : lower.replace(/[āâ]/g, 'aa').replace(/[īî]/g, 'ii').replace(/[ūû]/g, 'uu').replace(/[ēê]/g, 'ei').replace(/[ōô]/g, 'ou');
  const kana = toKana(plain);
  return katakana ? toKatakana(kana) : kana;
}

export const ROMAJI_LIKE = /^[A-Za-zāīūēōâîûêô\s'.,?!/…~()-]+$/;
const HAS_KANA = /[\u3040-\u30ff]/;
const HAS_KANJI = /[\u4e00-\u9fff]/;

/** What a column holds. '' = ignore the column. */
export type VocabField = 'kana' | 'romaji' | 'kanji' | 'de' | 'en' | 'meaning' | 'lesson' | 'tags' | '';

export const FIELD_LABELS: Record<VocabField, string> = {
  kana: 'Kana', romaji: 'Romaji', kanji: 'Kanji', de: 'German', en: 'English', meaning: 'Meaning', lesson: 'Lesson', tags: 'Tags', '': 'Ignore',
};

const HEADER_ALIASES: Record<string, VocabField> = {
  kana: 'kana', hiragana: 'kana', reading: 'kana', lesung: 'kana', yomi: 'kana', japanese: 'kana', japanisch: 'kana',
  kanji: 'kanji',
  romaji: 'romaji', rōmaji: 'romaji', term: 'romaji', begriff: 'romaji', romanization: 'romaji', romanisierung: 'romaji',
  de: 'de', german: 'de', deutsch: 'de', bedeutung: 'de',
  en: 'en', english: 'en', englisch: 'en',
  meaning: 'meaning', definition: 'meaning',
  lesson: 'lesson', lektion: 'lesson', kapitel: 'lesson', chapter: 'lesson', lesson_number: 'lesson', 'lesson number': 'lesson',
  tags: 'tags', tag: 'tags',
};

export const headerField = (h: string): VocabField => HEADER_ALIASES[h.toLowerCase().trim()] ?? '';

/** Guess whether the first row is a header and what each column holds (the import screen lets you change it). */
export function guessColumns(rows: string[][]): { hasHeader: boolean; mapping: VocabField[] } {
  const width = Math.max(0, ...rows.map((r) => r.length));
  const header = (rows[0] ?? []).map(headerField);
  if (header.some(Boolean)) return { hasHeader: true, mapping: Array.from({ length: width }, (_, i) => header[i] ?? '') };
  const mapping: VocabField[] = [];
  const share = (i: number, test: (v: string) => boolean) => {
    const cells = rows.map((r) => r[i] ?? '').filter(Boolean);
    return cells.length ? cells.filter(test).length / cells.length : 0;
  };
  for (let i = 0; i < width; i++) {
    const used = new Set(mapping);
    if (share(i, (v) => HAS_KANA.test(v)) > 0.5 && !used.has('kana')) mapping.push('kana');
    else if (share(i, (v) => HAS_KANJI.test(v)) > 0.5 && !used.has('kanji')) mapping.push('kanji');
    else if (share(i, (v) => /^\d{1,3}$/.test(v)) > 0.8 && !used.has('lesson')) mapping.push('lesson');
    else if (!used.has('kana') && !used.has('romaji') && share(i, (v) => ROMAJI_LIKE.test(v)) > 0.5) mapping.push('romaji');
    else if (!used.has('meaning')) mapping.push('meaning');
    else mapping.push('');
  }
  return { hasHeader: false, mapping };
}

export interface RowError { line: number; text: string; reason: string }

/**
 * Rows → vocab entries with the given column mapping. Every row keeps its position; rows without a word or a
 * meaning are reported (with their line number) instead of being dropped silently.
 */
export function rowsToEntries(
  rows: string[][], mapping: VocabField[],
  opts: { source: string; meaningLang?: 'de' | 'en'; lesson?: number; firstLine?: number; startPos?: number },
): { entries: VocabRow[]; errors: RowError[] } {
  const { source, meaningLang = 'de', firstLine = 1, startPos = 0 } = opts;
  const col = (name: VocabField) => mapping.indexOf(name);
  const entries: VocabRow[] = [];
  const errors: RowError[] = [];
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    const get = (name: VocabField) => (col(name) >= 0 ? r[col(name)] ?? '' : '');
    const kana = get('kana') || (get('romaji') ? romajiToKana(get('romaji')) : '');
    const meaning = get('meaning');
    const de = get('de') || (meaningLang === 'de' ? meaning : '');
    const en = get('en') || (meaningLang === 'en' ? meaning : '');
    const lesson = parseInt(get('lesson'), 10);
    if (!kana || (!de && !en)) {
      errors.push({ line: firstLine + i, text: r.join(' | '), reason: !kana ? 'no Japanese word' : 'no meaning' });
      return;
    }
    let id = `${source}-${kana}${get('kanji') ? '-' + get('kanji') : ''}`.replace(/[:\s]/g, '_');
    while (seen.has(id)) id += '+';
    seen.add(id);
    const tags = get('tags') ? get('tags').split(/[|/ ]+/).filter(Boolean) : undefined;
    entries.push({
      id, kana, kanji: get('kanji') || undefined, de: de || en, en: en || de,
      lesson: Number.isFinite(lesson) ? lesson : opts.lesson ?? 0, source, ...(tags ? { tags } : {}),
      pos: startPos + entries.length,
    });
  });
  return { entries, errors };
}

/** Normalised word for duplicate checks: no spaces, brackets, ～ or punctuation; katakana = hiragana. */
export const dupKey = (kana: string) =>
  kana.replace(/[\s～〜。、？！?!・[\]()（）]/g, '').replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/**
 * Turn CSV text into vocab entries (used by the course-pack build and the tests).
 * Expected columns (any order, header row required): kana or romaji, kanji (optional), de and/or en (or "meaning"), lesson.
 * A headerless tab-separated text is read as a Quizlet export (term ⇥ definition).
 */
export function parseVocabCsv(text: string, source: string, meaningLang: 'de' | 'en' = 'de'): { entries: VocabRow[]; errors: string[] } {
  const rows = parseCsv(text);
  const guess = guessColumns(rows);
  const quizlet = !guess.hasHeader && text.split('\n')[0].includes('\t') && rows.every((r) => r.length >= 2);
  if (!guess.hasHeader && !quizlet) return { entries: [], errors: ['Need a header row (kana or romaji, de/en/meaning, lesson).'] };
  if (guess.hasHeader && rows.length < 2) return { entries: [], errors: ['Need a header row and at least one word.'] };
  const mapping = guess.mapping;
  const errors: string[] = [];
  if (!mapping.includes('kana') && !mapping.includes('romaji')) errors.push('Missing a "kana" (or "romaji") column.');
  if (!mapping.includes('de') && !mapping.includes('en') && !mapping.includes('meaning')) errors.push('Missing a meaning column ("de", "en" or "meaning").');
  if (errors.length) return { entries: [], errors };
  const body = guess.hasHeader ? rows.slice(1) : rows;
  const res = rowsToEntries(body, mapping, { source, meaningLang, firstLine: guess.hasHeader ? 2 : 1 });
  return { entries: res.entries, errors: res.errors.map((e) => `Line ${e.line}: ${e.reason} – skipped.`) };
}
