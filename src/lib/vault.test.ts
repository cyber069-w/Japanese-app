import { describe, expect, it } from 'vitest';
import { decryptJson, deriveVaultKey, encryptJson, randomSalt } from './vault';

describe('vault crypto', () => {
  it('round-trips with the right password and fails with a wrong one', async () => {
    const salt = randomSalt();
    const key = await deriveVaultKey('correct horse', salt, 1000);
    const c = await encryptJson(key, { amount: 12.5, note: 'Bücher' });
    expect(await decryptJson(key, c)).toEqual({ amount: 12.5, note: 'Bücher' });
    await expect(decryptJson(await deriveVaultKey('wrong', salt, 1000), c)).rejects.toThrow();
  });
  it('every encryption is different (fresh IV) and tampering is detected', async () => {
    const key = await deriveVaultKey('pw', randomSalt(), 1000);
    const a = await encryptJson(key, 'same'), b = await encryptJson(key, 'same');
    expect(a).not.toBe(b);
    const bad = a.slice(0, -4) + (a.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    await expect(decryptJson(key, bad)).rejects.toThrow();
  });
});
