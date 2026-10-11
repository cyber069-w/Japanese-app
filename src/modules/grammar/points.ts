/** All grammar points (Minna no Nihongo lessons 1–10) from the JSON data files. */
import type { Meaning } from '../../core/types';
import l1 from './data/lessons-01-05.json';
import l2 from './data/lessons-06-10.json';

export interface RawExample extends Meaning {
  /** Sentence in the notation described in sentence.ts */
  ja: string;
  /** Other particles that are also correct in a blank, e.g. { "に": ["から"] } */
  ok?: Record<string, string[]>;
}

export interface GrammarPoint {
  id: string;
  lesson: number;
  pattern: string;
  title: Meaning;
  explain: Meaning;
  examples: RawExample[];
}

export const POINTS: GrammarPoint[] = [...(l1 as GrammarPoint[]), ...(l2 as GrammarPoint[])];
