#!/usr/bin/env node
/**
 * Prints the free-text answers waiting for grading (the app's synced "grading:queue") as JSON.
 * Reads private/sync-config.json, fetches progress.enc from your sync repo and decrypts it on this Mac.
 * Prints [] when sync isn't set up or nothing is waiting – never fails the daily job.
 */
import { createDecipheriv, pbkdf2Sync } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cfgFile = join(dirname(fileURLToPath(import.meta.url)), '../../private/sync-config.json');
const out = (v) => { console.log(JSON.stringify(v)); process.exit(0); };
if (!existsSync(cfgFile)) out([]);
try {
  const { repo, token, password } = JSON.parse(readFileSync(cfgFile, 'utf8'));
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const meta = await fetch(`https://api.github.com/repos/${repo}/contents/progress.enc`, { headers });
  if (!meta.ok) out([]);
  const sha = (await meta.json()).sha;
  const blob = await (await fetch(`https://api.github.com/repos/${repo}/git/blobs/${sha}`, { headers })).json();
  const file = Buffer.from(blob.content, 'base64');
  const salt = file.subarray(5, 21), iv = file.subarray(21, 33), body = file.subarray(33);
  const key = pbkdf2Sync(password.trim(), salt, 310_000, 32, 'sha256');
  const d = createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(body.subarray(body.length - 16));
  const data = JSON.parse(gunzipSync(Buffer.concat([d.update(body.subarray(0, body.length - 16)), d.final()])).toString('utf8'));
  out(Object.values(data.kv?.['grading:queue']?.items ?? {}).map((i) => i.v));
} catch (e) {
  console.error(`read-queue: ${e.message}`);
  out([]);
}
