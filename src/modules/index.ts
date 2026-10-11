/**
 * The module registry. To add a module: create a folder in src/modules/,
 * export a StudyModule from it and add it to this list – Home, Study,
 * Review and Stats pick it up automatically.
 */
import type { StudyModule } from '../core/types';
import { hiragana } from './hiragana';
import { katakana } from './katakana';
import { numbers } from './numbers';
import { vocab } from './vocab';
import { grammar } from './grammar';
import { kanji } from './kanji';
import { listening } from './listening';
import { speaking } from './speaking';

export const MODULES: StudyModule[] = [hiragana, katakana, vocab, kanji, grammar, numbers, listening, speaking];

export function getModule(id: string): StudyModule | undefined {
  return MODULES.find((m) => m.id === id);
}
