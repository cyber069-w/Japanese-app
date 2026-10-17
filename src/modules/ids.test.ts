/**
 * Saved progress is keyed "module:exercise:item". Renaming a module or an
 * exercise would silently orphan everything learned in it (on every synced
 * device), so these ids are frozen. Add new ones freely – never rename.
 */
import { describe, expect, it } from 'vitest';
import { MODULES } from '.';

describe('progress ids', () => {
  it('keeps every module and exercise id', () => {
    expect(Object.fromEntries(MODULES.map((m) => [m.id, m.exercises.map((e) => e.id)]))).toEqual({
      hiragana: ['read', 'recall', 'words', 'write'],
      katakana: ['read', 'recall', 'words', 'write', 'lookalikes'],
      vocab: ['meaning', 'type', 'choose', 'cards'],
      kanji: ['meaning', 'reading', 'words', 'write'],
      grammar: ['notes', 'particles', 'order', 'forms', 'translate'],
      numbers: ['read', 'write', 'listen'],
      listening: ['dictation', 'meaning', 'alikes', 'sentences', 'sentence-dictation'],
      speaking: ['questions', 'listen', 'intro'],
    });
  });
});
