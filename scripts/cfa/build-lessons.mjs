#!/usr/bin/env node
/**
 * Encrypts the private lesson packs (private/cfa/packs/<topic>-all.json) into public/cfa-lessons/<topic>.enc, so the
 * app loads new lesson versions by itself – no manual import. Same passphrase and salt as the lesson PDFs
 * (public/cfa-pdf/index.json), so the key a device already keeps opens these too.
 *
 *   node scripts/cfa/build-lessons.mjs        (after python3 scripts/cfa/merge-learn.py <topic>)
 *
 * File format: "NHPK" | version(1) | salt(16) | iv(12) | AES-256-GCM(gzip(JSON)).
 * index.json: { version, topics } – "version" changes with the content, which tells devices to reload.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash, randomBytes, webcrypto } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const packs = join(root, 'private/cfa/packs');
const out = join(root, 'public/cfa-lessons');
const passFile = join(root, 'private/PASSPHRASE.txt');
const pdfIndex = join(root, 'public/cfa-pdf/index.json');
if (!existsSync(packs) || !existsSync(passFile) || !existsSync(pdfIndex)) {
  console.error('Needs private/cfa/packs, private/PASSPHRASE.txt and public/cfa-pdf/index.json (run build-pdfs.mjs first).');
  process.exit(1);
}

const { subtle } = webcrypto;
const salt = Buffer.from(JSON.parse(readFileSync(pdfIndex, 'utf8')).salt, 'base64');
const material = await subtle.importKey('raw', new TextEncoder().encode(readFileSync(passFile, 'utf8').trim()), 'PBKDF2', false, ['deriveKey']);
const key = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const topics = [];
const hash = createHash('sha256');
for (const f of readdirSync(packs).filter((f) => f.endsWith('-all.json')).sort()) {
  const topic = f.replace(/-all\.json$/, '');
  const plain = readFileSync(join(packs, f));
  hash.update(plain);
  const iv = randomBytes(12);
  const cipher = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, gzipSync(plain)));
  writeFileSync(join(out, `${topic}.enc`), Buffer.concat([Buffer.from('NHPK'), Buffer.from([1]), salt, iv, cipher]));
  topics.push(topic);
}
writeFileSync(join(out, 'index.json'), JSON.stringify({ version: hash.digest('hex').slice(0, 12), topics }) + '\n');
console.log(`Lesson packs encrypted into public/cfa-lessons: ${topics.join(', ')}.`);
