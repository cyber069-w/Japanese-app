/** Speaking stats from a transcript: length, words per minute, filler words; warm-up streak and trend. */
export interface SpeechStats { seconds: number; words: number; wpm: number; fillers: number; fillersPerMin: number; byWord: Record<string, number> }

/** Spec list: um, uh, like, basically, ähm, also (+ äh). "also" only counts in German – in English it is a normal word. */
const w = (body: string) => new RegExp(`(?<![\\p{L}])(?:${body})(?![\\p{L}])`, 'giu');
const FILLERS: Array<[string, RegExp, boolean]> = [
  ['um', w('um+|umm+|erm'), false], ['uh', w('uh+|uhh+'), false], ['like', w('like'), false], ['basically', w('basically'), false],
  ['ähm', w('ähm+|äh+|ehm+'), false], ['also', w('also'), true],
];

export function speechStats(transcript: string, seconds: number, lang: 'en' | 'de' = 'en'): SpeechStats {
  const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const byWord: Record<string, number> = {};
  for (const [name, re, germanOnly] of FILLERS) {
    if (germanOnly && lang !== 'de') continue;
    const n = (transcript.match(re) ?? []).length;
    if (n) byWord[name] = n;
  }
  const fillers = Object.values(byWord).reduce((a, b) => a + b, 0);
  const min = Math.max(seconds, 1) / 60;
  return { seconds, words, wpm: Math.round(words / min), fillers, fillersPerMin: Math.round((fillers / min) * 10) / 10, byWord };
}

export interface Attempt {
  id: string; qid: string; at: number; seconds: number; target: number; transcript: string;
  words: number; wpm: number; fillers: number; fillersPerMin: number; rating: number; warmup?: boolean; lang: 'en' | 'de';
}

const dayOf = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const prev = (key: string) => { const [y, m, d] = key.split('-').map(Number); return dayOf(new Date(y, m - 1, d - 1).getTime()); };

/** Consecutive days with a warm-up, ending today – or yesterday while today's isn't done yet. */
export function warmupStreak(attempts: Attempt[], now: number): number {
  const days = new Set(attempts.filter((a) => a.warmup).map((a) => dayOf(a.at)));
  let day = dayOf(now);
  if (!days.has(day)) day = prev(day);
  let n = 0;
  while (days.has(day)) { n++; day = prev(day); }
  return n;
}

/** One question per day, the same all day: picks by the date so it doesn't change on reload. */
export function warmupPick<T extends { id: string }>(questions: T[], now: number): T | null {
  if (!questions.length) return null;
  const key = dayOf(now);
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return [...questions].sort((a, b) => a.id.localeCompare(b.id))[h % questions.length];
}

export const warmupDone = (attempts: Attempt[], now: number) => attempts.some((a) => a.warmup && dayOf(a.at) === dayOf(now));

/** Grade for the SRS from a 1–5 self-rating. */
export const gradeOfRating = (r: number): 'again' | 'hard' | 'good' | 'easy' => (r <= 2 ? 'again' : r === 3 ? 'hard' : r === 4 ? 'good' : 'easy');
