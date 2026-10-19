/** Exam dates: per app course in settings.examDates; for other subjects (Mikro, Politik …) in device storage "exams:other". */
import { COURSES } from '../courses';
import { COURSE_SUBJECT, focusSubject } from './today';
import { updateSettings, getState } from './store';
import { storage } from './db';

export interface ExamProposal { id: string; subject: string; date: string; snippet: string; source?: string }

export const courseIdFor = (subject: string): string | undefined =>
  COURSES.find((c) => (COURSE_SUBJECT[c.id] ?? c.name) === focusSubject(subject))?.id;

export async function acceptExamDate(p: ExamProposal) {
  const id = courseIdFor(p.subject);
  if (id) {
    updateSettings({ examDates: { ...getState().settings.examDates, [id]: p.date } });
    return;
  }
  const other = (await storage.get<Record<string, string>>('exams:other')) ?? {};
  await storage.set('exams:other', { ...other, [focusSubject(p.subject)]: p.date });
}
