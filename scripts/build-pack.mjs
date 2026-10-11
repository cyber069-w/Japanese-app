#!/usr/bin/env node
/**
 * Encrypts the private course pack into public/pack.enc so the deployed app can
 * carry it without publishing the copyrighted content in readable form.
 *
 *   npm run pack
 *
 * The passphrase is read from private/PASSPHRASE.txt (created with a random
 * passphrase on first run). Enter it once per device in Settings → Course pack.
 *
 * File format: "NHPK" | version(1) | salt(16) | iv(12) | AES-256-GCM(gzip(JSON))
 * Key: PBKDF2-SHA-256, 310 000 iterations.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { webcrypto, randomBytes, randomInt } from 'node:crypto';
import { buildPrivatePack } from './pack-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const passFile = join(root, 'private', 'PASSPHRASE.txt');

if (!existsSync(join(root, 'private'))) {
  console.error('No private/ folder – nothing to pack.');
  process.exit(1);
}
if (!existsSync(passFile)) {
  const words = ['sakura', 'tanuki', 'kitsune', 'yama', 'kawa', 'umi', 'sora', 'hoshi', 'tsuki', 'kaze', 'neko', 'inu',
    'momiji', 'fuji', 'kumo', 'hana', 'mori', 'yuki', 'ame', 'niji', 'tako', 'sushi', 'ramen', 'onigiri', 'daruma', 'koi'];
  const pass = [0, 1, 2, 3].map(() => words[randomInt(words.length)]).join('-') + '-' + randomInt(10, 100);
  writeFileSync(passFile, pass + '\n');
  console.log(`Created a new passphrase in ${passFile}`);
}
const pass = readFileSync(passFile, 'utf8').trim();

const pack = buildPrivatePack(root);
const plain = gzipSync(Buffer.from(JSON.stringify(pack)));
const salt = randomBytes(16);
const iv = randomBytes(12);
const { subtle } = webcrypto;
const material = await subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
const key = await subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt'],
);
const cipher = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
const out = Buffer.concat([Buffer.from('NHPK'), Buffer.from([1]), salt, iv, cipher]);
writeFileSync(join(root, 'public', 'pack.enc'), out);
const pics = Object.values(pack.hints).reduce((n, h) => n + Object.keys(h).length, 0);
console.log(`public/pack.enc written (${(out.length / 1024).toFixed(0)} KB): ${pack.vocab.length} words, ${pics} pictures.`);
