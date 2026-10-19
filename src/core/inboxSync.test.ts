/// <reference types="node" />
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { decryptJson, deriveKey } from '../lib/crypto';

// same steps as scripts/canvas/push-inbox.mjs – the app must be able to read what the Mac job writes
it('the Mac job’s encrypted inbox decrypts in the app', async () => {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', pbkdf2Sync('pw', salt, 310_000, 32, 'sha256'), iv);
  const body = Buffer.concat([c.update(gzipSync(JSON.stringify({ at: 'x', deadlines: [] }))), c.final(), c.getAuthTag()]);
  const file = new Uint8Array(Buffer.concat([Buffer.from('NHSY'), Buffer.from([1]), salt, iv, body]));
  expect(await decryptJson(file, await deriveKey('pw', salt))).toEqual({ at: 'x', deadlines: [] });
});
