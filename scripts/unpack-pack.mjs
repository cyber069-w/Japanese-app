#!/usr/bin/env node
/**
 * Restores the git-ignored private/ folder from the encrypted public/pack.enc –
 * e.g. on a new machine or in a cloud session.
 *
 *   PACK_PASSPHRASE='…' npm run unpack
 *
 * Writes private/vocab/mnn-restored.csv, private/hints/<script>/<id>.jpg and private/PASSPHRASE.txt.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { webcrypto } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pass = (process.env.PACK_PASSPHRASE ?? '').trim();
if (!pass) {
  console.error('Set PACK_PASSPHRASE to the course pack passphrase.');
  process.exit(1);
}
const buf = readFileSync(join(root, 'public', 'pack.enc'));
if (buf.subarray(0, 4).toString() !== 'NHPK' || buf[4] !== 1) throw new Error('public/pack.enc is not a course pack');
const salt = buf.subarray(5, 21), iv = buf.subarray(21, 33), data = buf.subarray(33);
const { subtle } = webcrypto;
const material = await subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
const key = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
let plain;
try {
  plain = Buffer.from(await subtle.decrypt({ name: 'AES-GCM', iv }, key, data));
} catch {
  console.error('Wrong passphrase.');
  process.exit(1);
}
const pack = JSON.parse(gunzipSync(plain).toString('utf8'));

const priv = join(root, 'private');
mkdirSync(join(priv, 'vocab'), { recursive: true });
const q = (s) => (/[",\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : String(s ?? ''));
const rows = ['kana,kanji,de,en,lesson,tags', ...pack.vocab.map((v) => [v.kana, v.kanji ?? '', v.de, v.en, v.lesson, (v.tags ?? []).join(' ')].map(q).join(','))];
const csvPath = join(priv, 'vocab', 'mnn-restored.csv');
if (!existsSync(csvPath)) writeFileSync(csvPath, rows.join('\n') + '\n');
let pics = 0;
for (const [script, hints] of Object.entries(pack.hints)) {
  mkdirSync(join(priv, 'hints', script), { recursive: true });
  for (const [id, url] of Object.entries(hints)) {
    const [, mime, b64] = /^data:([^;]+);base64,(.*)$/.exec(url);
    writeFileSync(join(priv, 'hints', script, `${id}.${mime.split('/')[1].replace('jpeg', 'jpg')}`), Buffer.from(b64, 'base64'));
    pics++;
  }
}
if (!existsSync(join(priv, 'PASSPHRASE.txt'))) writeFileSync(join(priv, 'PASSPHRASE.txt'), pass + '\n');
console.log(`Restored private/: ${pack.vocab.length} words, ${pics} pictures.`);
