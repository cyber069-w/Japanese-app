/**
 * "Ask tutor": there is no AI connection inside the app (no keys, no backend). The button copies a
 * prompt with the context to the clipboard and opens Claude – the subject's Claude Project if you set
 * its link in Settings (Settings → Tutor), otherwise a new chat. You paste (⌘V) and send.
 */
import { getState } from '../core/store';

export interface TutorRequest {
  courseId: string;
  courseName: string;
  /** What the question is about, e.g. "Grammar entry: N1 wa N2 desu". */
  topic: string;
  /** The material, as plain text. */
  context: string;
  /** What the tutor should do. */
  task: string;
}

const STYLE: Record<string, string> = {
  japanese: 'Antworte auf Deutsch. Ich kann noch keine japanische Schrift lesen: schreib Japanisch immer in Romaji (Hepburn) und nur zusätzlich in Klammern in Kana/Kanji.',
};

export function tutorPrompt(r: TutorRequest, courseName: string): string {
  return [
    `Du bist mein Tutor für ${courseName}. ${STYLE[r.courseId] ?? 'Antworte auf Deutsch, kurz und prüfungsnah.'}`,
    '',
    `Thema: ${r.topic}`,
    '',
    r.context,
    '',
    `Aufgabe: ${r.task}`,
  ].join('\n');
}

/** Copies the prompt and opens Claude in a new tab (both inside the click). Resolves to false if copying was blocked. */
export async function askTutor(r: TutorRequest): Promise<boolean> {
  const copy = navigator.clipboard?.writeText(tutorPrompt(r, r.courseName)).then(() => true, () => false) ?? Promise.resolve(false);
  window.open(getState().settings.tutorUrls?.[r.courseId] || 'https://claude.ai/new', '_blank', 'noopener');
  return copy;
}
