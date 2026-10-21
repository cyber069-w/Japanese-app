/**
 * "Explain" for something marked on a lesson page: what the lesson already explains (its words and notes) shows at once,
 * offline; everything else goes to the tutor. Today that means Claude: marked text as a prompt (copied, Claude opens),
 * a marked area as an image through the share sheet. When the app gets its own API access, `askTutor` answers here.
 */
import { useEffect, useMemo, useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { Icon } from '../../components/Icon';
import { TutorButton } from '../../components/TutorButton';
import { logHistory } from '../../core/history';
import { tutorPrompt, type TutorRequest } from '../../lib/tutor';
import { CFA_TOPIC_NAMES, type CfaLesson, type CfaTerm } from './lessons';

export type Marked =
  | { kind: 'text'; text: string; page: number; pageText: string }
  | { kind: 'area'; image: Blob; page: number; pageText: string; /** page text inside the box (may be empty, e.g. a chart) */ text: string };

const flat = (s: string) => s.replace(/\s+/g, '').toLowerCase();
/** "Holding period return (HPR)" → ["holding period return", "hpr"] */
const names = (t: CfaTerm) => [t.term.replace(/\s*\(.*\)\s*/g, ''), ...[...t.term.matchAll(/\(([^)]+)\)/g)].map((m) => m[1])].map((s) => s.trim().toLowerCase()).filter((s) => s.length > 1);

/** The lesson's words that appear in the marked text. */
export function wordsIn(text: string, words: CfaTerm[]): CfaTerm[] {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9%.$ ]+/g, ' ')} `;
  return words.filter((w) => names(w).some((n) => t.includes(` ${n} `) || t.includes(` ${n}s `)));
}

export function ExplainSheet({ lesson, marked, lang, onClose }: { lesson: CfaLesson; marked: Marked; lang: 'en' | 'de'; onClose: () => void }) {
  const de = lang === 'de';
  const learn = lesson.learn;
  const [shareNote, setShareNote] = useState('');
  const imageUrl = useMemo(() => (marked.kind === 'area' ? URL.createObjectURL(marked.image) : ''), [marked]);
  useEffect(() => () => void (imageUrl && URL.revokeObjectURL(imageUrl)), [imageUrl]);

  // what the lesson already says about it
  const words = wordsIn(marked.text, [...(learn?.words ?? []), ...lesson.terms]).slice(0, 6);
  const notes = (learn?.annotations ?? []).filter((a) => {
    if (a.page !== marked.page) return false;
    const [q, s] = [flat(a.quote), flat(marked.text)];
    return s.length >= 4 && (s.includes(q) || q.includes(s));
  });

  const request = (): TutorRequest => ({
    courseId: 'cfa',
    courseName: 'CFA Level I',
    topic: `${CFA_TOPIC_NAMES[lesson.topic] ?? lesson.topic} – ${lesson.title}, page ${marked.page}`,
    context: [
      marked.kind === 'text'
        ? `Marked text:\n"${marked.text}"`
        : `Marked part of the page: see the attached image.${marked.text ? `\nText in that part (may be garbled for formulas): "${marked.text}"` : ''}`,
      `The page it is on (for context):\n${marked.pageText.slice(0, 2500)}`,
    ].join('\n\n'),
    task: de
      ? 'Erkläre mir den markierten Teil ganz einfach, Schritt für Schritt. Ist es eine Formel oder ein Diagramm: erkläre jedes Symbol bzw. jede Achse und rechne ein kleines Beispiel. Antworte auf Deutsch und nenne die englischen Fachbegriffe in Klammern.'
      : 'Explain the marked part very simply, step by step. If it is a formula or a diagram, explain every symbol or axis and work one small example. Answer in English and explain every technical term.',
  });

  const shareArea = async () => {
    if (marked.kind !== 'area') return;
    const file = new File([marked.image], `${lesson.topic}-${lesson.module ?? 'x'}-page-${marked.page}.png`, { type: 'image/png' });
    const text = tutorPrompt(request(), 'CFA Level I');
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        logHistory('tutor', `Area shared with tutor: ${lesson.title}, page ${marked.page}`);
        return;
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': marked.image })]);
      setShareNote('Image copied – now tap “Ask tutor”, paste the image into Claude, then paste the question.');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setShareNote('Sharing didn’t work here – save the image and add it in Claude by hand.');
    }
  };

  return (
    <Sheet title={de ? 'Erklärung' : 'Explain'} onClose={onClose}>
      <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        {marked.kind === 'text' ? (
          <blockquote className="explain-quote">“{marked.text}”</blockquote>
        ) : (
          <img className="explain-image" src={imageUrl} alt={`Marked part of page ${marked.page}`} />
        )}

        {(notes.length > 0 || words.length > 0) && (
          <section className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
            <div className="eyebrow">{de ? 'Aus dieser Lektion' : 'From this lesson'}</div>
            {notes.map((n, i) => (
              <div key={`n${i}`} className="anno-note">
                {(de ? n.de?.title ?? n.title : n.title) && <b>{de ? n.de?.title ?? n.title : n.title}</b>}
                <p>{de ? n.de?.note ?? n.note : n.note}</p>
              </div>
            ))}
            {words.map((w) => (
              <div key={w.term} className="explain-word">
                <b>{w.term}</b>
                <span>{de && w.de ? w.de : w.definition}</span>
              </div>
            ))}
          </section>
        )}

        <section className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <div className="eyebrow">Tutor</div>
          <p className="faint small" style={{ margin: 0 }}>
            {notes.length || words.length
              ? de ? 'Noch unklar? Der Tutor erklärt es dir ausführlich.' : 'Still unclear? The tutor explains it in detail.'
              : de ? 'Dazu gibt es in der Lektion noch keine Erklärung – frag den Tutor.' : 'The lesson has no explanation for this yet – ask the tutor.'}
          </p>
          <div className="row" style={{ gap: 8 }}>
            {marked.kind === 'area' && (
              <button className="btn btn-sm btn-primary" onClick={() => void shareArea()}>
                <Icon name="upload" size={15} /> {de ? 'Bild an den Tutor' : 'Send image to tutor'}
              </button>
            )}
            <TutorButton small request={request} />
          </div>
          {shareNote && <p className="faint tiny" style={{ margin: 0 }}>{shareNote}</p>}
        </section>
      </div>
    </Sheet>
  );
}
