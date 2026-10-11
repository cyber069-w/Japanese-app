/** Hands a prepared session from the screen that starts it to the session screen. */
import type { SessionCard } from './session';
import type { BaseItem } from './types';
import { navigate } from '../lib/router';

export interface SessionConfig {
  title: string;
  cards: SessionCard[];
  /** Items used for multiple-choice distractors, by "module:exercise" (defaults to all items). */
  pools?: Record<string, BaseItem[]>;
  /** Where "Done" leads. */
  back: string;
  /** Build a fresh session with the same settings ("Again" button). */
  rebuild?: () => SessionCard[];
}

let current: SessionConfig | null = null;

export function startSession(cfg: SessionConfig) {
  current = cfg;
  navigate('/session');
}

export const getSession = () => current;
