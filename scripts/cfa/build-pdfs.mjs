#!/usr/bin/env node
/**
 * Encrypts the CFA lesson PDFs (private/cfa/lessons/<topic>/NN-*.pdf) into public/cfa-pdf/<topic>-<NN>.enc,
 * with the course-pack passphrase (private/PASSPHRASE.txt), so the deployed app can carry them without
 * publishing them in readable form. The app fetches a file the first time a lesson's PDF is opened and keeps it.
 *
 *   node scripts/cfa/build-pdfs.mjs
 *
 * Every file uses the salt in public/cfa-pdf/index.json, so one key (derived once per device) opens them all. The salt is kept
 * across rebuilds (devices keep their key); "version" changes with the PDFs' content, so devices replace their cached copies.
 * File format: "NHPK" | version(1) | salt(16) | iv(12) | AES-256-GCM(pdf bytes)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, webcrypto } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const src = join(root, 'private/cfa/lessons');
const out = join(root, 'public/cfa-pdf');
const passFile = join(root, 'private/PASSPHRASE.txt');
if (!existsSync(src) || !existsSync(passFile)) {
  console.error('Needs private/cfa/lessons and private/PASSPHRASE.txt.');
  process.exit(1);
}

const { subtle } = webcrypto;
const old = existsSync(join(out, 'index.json')) ? JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')) : null;
const salt = old?.salt ? Buffer.from(old.salt, 'base64') : randomBytes(16);
const material = await subtle.importKey('raw', new TextEncoder().encode(readFileSync(passFile, 'utf8').trim()), 'PBKDF2', false, ['deriveKey']);
const key = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const files = [];
const hash = createHash('sha256');
let bytes = 0;
for (const topic of readdirSync(src, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  const dir = join(src, topic);
  for (const f of readdirSync(dir).filter((f) => /^\d\d-.*\.pdf$/.test(f)).sort()) {
    const name = `${topic}-${Number(f.slice(0, 2))}`;
    hash.update(readFileSync(join(dir, f)));
    const iv = randomBytes(12);
    const cipher = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, readFileSync(join(dir, f))));
    const file = Buffer.concat([Buffer.from('NHPK'), Buffer.from([1]), salt, iv, cipher]);
    writeFileSync(join(out, `${name}.enc`), file);
    files.push(name);
    bytes += file.length;
  }
}
writeFileSync(join(out, 'index.json'), JSON.stringify({ salt: salt.toString('base64'), version: hash.digest('hex').slice(0, 12), files }) + '\n');
console.log(`${files.length} lesson PDFs encrypted into public/cfa-pdf (${(bytes / 1024 / 1024).toFixed(1)} MB).`);
