/** Pronunciation attempts per sentence (this device): best and last scores. */
import { storage } from '../../core/db';

export interface Attempt { sentence: string; at: number; accuracy: number; fluency: number; completeness: number; overall: number }
const KEY = 'speaking:attempts';
export const MAX_ATTEMPTS = 500;

export const loadAttempts = async () => (await storage.get<Attempt[]>(KEY)) ?? [];
export async function addAttempt(a: Attempt): Promise<Attempt[]> {
  const list = [...(await loadAttempts()), a].slice(-MAX_ATTEMPTS);
  await storage.set(KEY, list);
  return list;
}

export function progress(list: Attempt[], sentence: string): { n: number; best: number; last: number } | null {
  const mine = list.filter((a) => a.sentence === sentence);
  if (!mine.length) return null;
  return { n: mine.length, best: Math.max(...mine.map((a) => a.overall)), last: mine[mine.length - 1].overall };
}
