#!/usr/bin/env node
/**
 * Writes private/canvas-inbox.json into your device-sync repository as an encrypted file
 * (canvas-inbox.enc, same format and password as progress.enc), so the app on your phone can read it.
 * Needs private/sync-config.json: { "repo": "owner/name", "token": "<GitHub token, Contents: read+write>", "password": "<sync password>" }
 * Skips quietly when that file or progress.enc (the app's own sync file, which holds the salt) is missing.
 */
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const priv = join(dirname(fileURLToPath(import.meta.url)), '../../private');
const cfgFile = join(priv, 'sync-config.json');
const inboxFile = join(priv, 'canvas-inbox.json');
if (!existsSync(cfgFile)) {
  console.log('Device sync not set up for the Mac job (private/sync-config.json missing) – inbox stays on this Mac.');
  process.exit(0);
}
const { repo, token, password } = JSON.parse(readFileSync(cfgFile, 'utf8'));
const api = `https://api.github.com/repos/${repo}/contents/`;
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };

async function getFile(path) {
  const r = await fetch(api + path, { headers });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub ${r.status} for ${path}`);
  const j = await r.json();
  const blob = await (await fetch(`https://api.github.com/repos/${repo}/git/blobs/${j.sha}`, { headers })).json();
  return { sha: j.sha, bytes: Buffer.from(blob.content, 'base64') };
}

const progress = await getFile('progress.enc');
if (!progress) {
  console.log('No progress.enc in the sync repo yet – connect device sync in the app first.');
  process.exit(0);
}
const salt = progress.bytes.subarray(5, 21);
const key = pbkdf2Sync(password.trim(), salt, 310_000, 32, 'sha256');
const iv = randomBytes(12);
const cipher = createCipheriv('aes-256-gcm', key, iv);
const body = Buffer.concat([cipher.update(gzipSync(readFileSync(inboxFile))), cipher.final(), cipher.getAuthTag()]); // WebCrypto: ciphertext ‖ tag
const out = Buffer.concat([Buffer.from('NHSY'), Buffer.from([1]), salt, iv, body]);

const old = await getFile('canvas-inbox.enc');
const res = await fetch(api + 'canvas-inbox.enc', {
  method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Canvas inbox', content: out.toString('base64'), ...(old ? { sha: old.sha } : {}) }),
});
if (!res.ok) throw new Error(`GitHub ${res.status} while writing canvas-inbox.enc`);
console.log('Inbox written to the sync repo (encrypted).');
