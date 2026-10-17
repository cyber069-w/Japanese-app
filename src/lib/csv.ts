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
}

/** One romaji word → kana. A capital first letter means katakana (loanwords, names); macron vowels (ō, ū …) are long vowels. */
export function romajiToKana(word: string): string {
  const w = word.trim();
  const katakana = /^[A-Z]/.test(w);
  const lower = w.toLowerCase();
  const plain = katakana
    ? lower.replace(/[āīūēōâîûêô]/g, (c) => c.normalize('NFD')[0] + '-').replace(/([aiueo])\1/g, '$1-')
    : lower.replace(/[āâ]/g, 'aa').replace(/[īî]/g, 'ii').replace(/[ūû]/g, 'uu').replace(/[ēê]/g, 'ei').replace(/[ōô]/g, 'ou');
  const kana = toKana(plain);
  return katakana ? toKatakana(kana) : kana;
}

const HEADER_ALIASES: Record<string, string> = {
  kana: 'kana', hiragana: 'kana', reading: 'kana', lesung: 'kana', yomi: 'kana', japanese: 'kana', japanisch: 'kana',
  kanji: 'kanji',
  romaji: 'romaji', romanization: 'romaji', romanisierung: 'romaji',
  de: 'de', german: 'de', deutsch: 'de', bedeutung: 'de',
  en: 'en', english: 'en', englisch: 'en',
  meaning: 'meaning',
  lesson: 'lesson', lektion: 'lesson', lesson_number: 'lesson', 'lesson number': 'lesson',
  tags: 'tags', tag: 'tags',
};

/**
 * Turn CSV text into vocab entries.
 * Expected columns (any order, header row required): kana, kanji (optional), de and/or en (or "meaning"), lesson.
 * `meaningLang` decides where a plain "meaning" column goes.
 */
export function parseVocabCsv(text: string, source: string, meaningLang: 'de' | 'en' = 'de'): { entries: VocabRow[]; errors: string[] } {
  const rows = parseCsv(text);
  const errors: string[] = [];
  if (rows.length < 2) return { entries: [], errors: ['Need a header row and at least one word.'] };
  const header = rows[0].map((h) => HEADER_ALIASES[h.toLowerCase().trim()] ?? '');
  const col = (name: string) => header.indexOf(name);
  if (col('kana') < 0 && col('romaji') < 0) errors.push('Missing a "kana" (or "romaji") column.');
  if (col('de') < 0 && col('en') < 0 && col('meaning') < 0) errors.push('Missing a meaning column ("de", "en" or "meaning").');
  if (errors.length) return { entries: [], errors };

  const entries: VocabRow[] = [];
  const seen = new Set<string>();
  rows.slice(1).forEach((r, i) => {
    const get = (name: string) => (col(name) >= 0 ? r[col(name)] ?? '' : '');
    const kana = get('kana') || romajiToKana(get('romaji'));
    const meaning = get('meaning');
    const de = get('de') || (meaningLang === 'de' ? meaning : '');
    const en = get('en') || (meaningLang === 'en' ? meaning : '');
    const lesson = parseInt(get('lesson'), 10);
    if (!kana || (!de && !en)) {
      errors.push(`Line ${i + 2}: needs kana and a meaning – skipped.`);
      return;
    }
    let id = `${source}-${kana}${get('kanji') ? '-' + get('kanji') : ''}`.replace(/[:\s]/g, '_');
    while (seen.has(id)) id += '+';
    seen.add(id);
    const tags = get('tags') ? get('tags').split(/[|/ ]+/).filter(Boolean) : undefined;
    entries.push({
      id, kana, kanji: get('kanji') || undefined, de: de || en, en: en || de,
      lesson: Number.isFinite(lesson) ? lesson : 0, source, ...(tags ? { tags } : {}),
    });
  });
  return { entries, errors };
}
