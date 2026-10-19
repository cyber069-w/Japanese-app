/** Tutor request for a new notes PDF / lecture slides: the answer format depends on the subject. */
import { LESSON_PROMPT } from '../modules/cfa/lessons';
import type { TutorRequest } from './tutor';

export const VOCAB_CSV_TASK =
  'Lies das angehängte PDF (Lektion mit Vokabeln) und antworte NUR mit einer CSV-Liste, eine Zeile pro Wort, im Format: romaji;deutsche Bedeutung (Hepburn-Romaji, Semikolon als Trenner, keine Kopfzeile, keine Erklärungen). Reihenfolge wie im PDF.';

export function notesRequest(subject: string, topic: string, notes: boolean): TutorRequest {
  const what = notes ? 'Neue Notizen' : 'Neue Folien';
  const base = { topic: `${what}: ${topic}`, context: `Ich hänge die Datei „${topic}“ an (PDF).` };
  if (subject === 'Japanisch')
    return { ...base, courseId: 'japanese', courseName: 'Japanisch', task: VOCAB_CSV_TASK };
  if (subject === 'CFA')
    return { ...base, courseId: 'cfa', courseName: 'CFA Level 1', task: `Lies das PDF und mach daraus ein Lernpaket.\n${LESSON_PROMPT}` };
  return {
    ...base, courseId: 'general', courseName: subject,
    task: 'Lies das PDF. Antworte auf Deutsch mit (1) einer Zusammenfassung in 10 Stichpunkten, (2) den wichtigsten Begriffen mit je einer Zeile Definition, (3) 8 Prüfungsfragen mit Antwort im Format Frage;Antwort (ein Eintrag pro Zeile, Quizlet-tauglich).',
  };
}
