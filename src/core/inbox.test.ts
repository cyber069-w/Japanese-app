import { describe, expect, it } from 'vitest';
import { appendNote, newInboxItem } from './inbox';

describe('inbox', () => {
  it('trims captured text', () => expect(newInboxItem('  call Max  ').text).toBe('call Max'));
  it('appends a dated note', () => {
    const t = new Date(2026, 9, 19).getTime();
    expect(appendNote('', 'sent CV', t)).toBe('2026-10-19: sent CV');
    expect(appendNote('first', 'second', t)).toBe('first\n2026-10-19: second');
  });
});
