/**
 * Shared spaced-repetition engine (SM-2 variant with learning steps).
 *
 * Every module stores its progress as CardState objects, one per
 * "card" = module + exercise + item. The engine is pure (no I/O) so it is easy
 * to test and could be swapped for FSRS later without touching the UI.
 *
 *  new card ──good──► 1 min ──good──► 10 min ──good──► 1 day ──► days × ease …
 *      ▲  again                                                │ again
 *      └───────────────── relearn (10 min) ◄───────────────────┘
 */

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface CardState {
  id: string;
  /** When the card is due again (epoch ms). */
  due: number;
  /** Current interval in days (0 while in the first learning steps). */
  interval: number;
  /** SM-2 ease factor (1.3 … 3.0). */
  ease: number;
  /** Learning step index, or -1 once the card has graduated to review. */
  step: number;
  /** Successful reviews in a row. */
  reps: number;
  /** How often a graduated card was forgotten. */
  lapses: number;
  /** Total answers / correct answers (for accuracy stats). */
  seen: number;
  correct: number;
  /** Last answer time (epoch ms). */
  last: number;
  /** Last time the answer was wrong (epoch ms), 0 if never. */
  lastWrong: number;
}

export const MINUTE = 60_000;
export const DAY = 86_400_000;

export const SRS_CONFIG = {
  learnSteps: [1 * MINUTE, 10 * MINUTE],
  relearnSteps: [10 * MINUTE],
  graduatingInterval: 1, // days
  easyInterval: 4, // days
  startEase: 2.5,
  minEase: 1.3,
  maxEase: 3.0,
  lapseIntervalFactor: 0.5,
  hardFactor: 1.2,
  easyBonus: 1.3,
  maxInterval: 365, // days
};

export function newCard(id: string, now: number): CardState {
  return {
    id, due: now, interval: 0, ease: SRS_CONFIG.startEase, step: 0,
    reps: 0, lapses: 0, seen: 0, correct: 0, last: 0, lastWrong: 0,
  };
}

const clampEase = (e: number) => Math.min(SRS_CONFIG.maxEase, Math.max(SRS_CONFIG.minEase, e));
const days = (d: number) => Math.round(d * DAY);

/**
 * Apply an answer to a card and return the new state (the input is not mutated).
 *
 * If a graduated card is practised *before* it is due (e.g. in a free study
 * session) a correct answer only updates the statistics – the schedule is not
 * pushed out. A wrong answer always counts, so mistakes come back sooner.
 */
export function review(card: CardState | undefined, grade: Grade, now: number, id = card?.id ?? ''): CardState {
  const c: CardState = card ? { ...card } : newCard(id, now);
  const ok = grade !== 'again';
  c.seen += 1;
  if (ok) c.correct += 1;
  else c.lastWrong = now;
  c.last = now;

  // Early practice of a graduated card: statistics only
  if (card && c.step === -1 && card.due > now && ok) return c;

  const C = SRS_CONFIG;
  if (c.step >= 0) {
    // ----- learning / relearning -----
    const steps = c.lapses > 0 ? C.relearnSteps : C.learnSteps;
    const step = Math.min(c.step, steps.length - 1);
    if (grade === 'again') {
      c.step = 0;
      c.reps = 0;
      c.due = now + steps[0];
    } else if (grade === 'hard') {
      c.due = now + Math.round(steps[step] * 1.5);
    } else if (grade === 'good') {
      if (step + 1 < steps.length) {
        c.step = step + 1;
        c.due = now + steps[step + 1];
      } else {
        graduate(c, c.interval > 0 ? c.interval : C.graduatingInterval, now);
      }
    } else {
      graduate(c, Math.max(c.interval, C.easyInterval), now);
    }
    return c;
  }

  // ----- review -----
  const elapsedDays = Math.max(0, (now - (card?.last ?? now)) / DAY);
  if (grade === 'again') {
    c.lapses += 1;
    c.reps = 0;
    c.ease = clampEase(c.ease - 0.2);
    c.interval = Math.max(1, Math.round(c.interval * C.lapseIntervalFactor));
    c.step = 0;
    c.due = now + C.relearnSteps[0];
    return c;
  }
  let interval: number;
  if (grade === 'hard') {
    c.ease = clampEase(c.ease - 0.15);
    interval = Math.max(c.interval + 1, c.interval * C.hardFactor);
  } else if (grade === 'good') {
    // reward remembering an overdue card by using the real elapsed time
    interval = Math.max(c.interval + 1, Math.max(c.interval, elapsedDays) * c.ease);
  } else {
    c.ease = clampEase(c.ease + 0.15);
    interval = Math.max(c.interval + 1, Math.max(c.interval, elapsedDays) * c.ease * C.easyBonus);
  }
  c.interval = Math.min(C.maxInterval, Math.round(interval));
  c.reps += 1;
  c.due = now + days(c.interval);
  return c;
}

function graduate(c: CardState, intervalDays: number, now: number) {
  c.step = -1;
  c.interval = intervalDays;
  c.reps += 1;
  c.due = now + days(intervalDays);
}

export const isDue = (c: CardState, at: number) => c.due <= at;

/** Smoothed accuracy (Laplace) so a single answer doesn't mean 0 % or 100 %. */
export const accuracy = (c: Pick<CardState, 'seen' | 'correct'>) => (c.correct + 1) / (c.seen + 2);

/**
 * How "weak" a card is (higher = needs more practice). Combines accuracy,
 * lapses and how recently the item was wrong.
 */
export function weakness(c: CardState, now: number): number {
  const recentWrong = c.lastWrong ? Math.max(0, 1 - (now - c.lastWrong) / (7 * DAY)) : 0;
  const learning = c.step >= 0 ? 0.15 : 0;
  return (1 - accuracy(c)) + 0.12 * c.lapses + 0.35 * recentWrong + learning - Math.min(0.3, c.interval / 100);
}

/** Map an answer to a grade: wrong → again, hint used → hard, fast → easy. */
export function gradeFromAnswer(correct: boolean, opts: { hinted?: boolean; ms?: number; fastMs?: number } = {}): Grade {
  if (!correct) return 'again';
  if (opts.hinted) return 'hard';
  if (opts.ms !== undefined && opts.fastMs !== undefined && opts.ms < opts.fastMs) return 'easy';
  return 'good';
}
