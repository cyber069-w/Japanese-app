#!/usr/bin/env node
/**
 * Extracts stroke-order paths from KanjiVG for all kana and the kanji the app uses.
 *
 *   node scripts/build-strokes.mjs <kanjivg-YYYYMMDD.xml.gz>
 *
 * Kanji are collected from src/modules/kanji/kanji.json plus any kanji found in
 * private/vocab/*.csv. Output: src/data/strokes.json  { "あ": ["M…", "M…"], … }
 *
 * KanjiVG © Ulrich Apel, CC BY-SA 3.0 – https://kanjivg.tagaini.net
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/build-strokes.mjs <kanjivg.xml.gz>');
  process.exit(1);
}
const xml = gunzipSync(readFileSync(src)).toString('utf8');

const wanted = new Set();
// all hiragana and katakana (incl. small ones and ヴ)
for (let c = 0x3041; c <= 0x3094; c++) wanted.add(String.fromCodePoint(c));
for (let c = 0x30a1; c <= 0x30f4; c++) wanted.add(String.fromCodePoint(c));
wanted.add('ー');
const isKanji = (ch) => /\p{Script=Han}/u.test(ch);
const kanjiFile = join(root, 'src/modules/kanji/kanji.json');
if (existsSync(kanjiFile)) for (const k of JSON.parse(readFileSync(kanjiFile, 'utf8'))) wanted.add(k.kanji);
const vocabDir = join(root, 'private/vocab');
if (existsSync(vocabDir)) {
  for (const f of readdirSync(vocabDir)) for (const ch of readFileSync(join(vocabDir, f), 'utf8')) if (isKanji(ch)) wanted.add(ch);
}

const out = {};
const re = /<kanji id="kvg:kanji_([0-9a-f]+)">([\s\S]*?)<\/kanji>/g;
let m;
while ((m = re.exec(xml))) {
  const ch = String.fromCodePoint(parseInt(m[1], 16));
  if (!wanted.has(ch)) continue;
  const paths = [...m[2].matchAll(/<path id="kvg:[^"]*-s(\d+)"[^>]*\sd="([^"]+)"/g)]
    .map((p) => [Number(p[1]), p[2].replace(/\s+/g, ' ').trim()])
    .sort((a, b) => a[0] - b[0])
    .map((p) => p[1]);
  if (paths.length) out[ch] = paths;
}
const missing = [...wanted].filter((c) => !out[c] && (isKanji(c) || /[ぁ-ゔァ-ヴ]/.test(c)));
mkdirSync(join(root, 'src/data'), { recursive: true });
writeFileSync(join(root, 'src/data/strokes.json'), JSON.stringify(out));
console.log(`wrote ${Object.keys(out).length} characters` + (missing.length ? `, missing: ${missing.join('')}` : ''));
