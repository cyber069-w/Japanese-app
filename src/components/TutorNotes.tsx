/** Summaries of tutor sessions per subject: paste what Claude summarised, find it again later. Stored on this device. */
import { useEffect, useState } from 'react';
import { storage } from '../core/db';
import { Icon } from './Icon';

interface Note { at: number; text: string }

export function TutorNotes({ courseId }: { courseId: string }) {
  const key = `tutor:notes:${courseId}`;
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState('');
  useEffect(() => {
    void storage.get<Note[]>(key).then((n) => setNotes(n ?? []));
  }, [key]);
  const save = async (list: Note[]) => {
    setNotes(list);
    await storage.set(key, list);
  };
  return (
    <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
      <div className="eyebrow">Session summaries</div>
      <textarea className="input" placeholder="At the end of a tutor chat, ask Claude for a short summary and paste it here." value={text} onChange={(e) => setText(e.target.value)} aria-label="Session summary" />
      <div>
        <button className="btn btn-sm" disabled={!text.trim()} onClick={() => { void save([{ at: Date.now(), text: text.trim() }, ...notes]); setText(''); }}>Save summary</button>
      </div>
      {notes.map((n) => (
        <details key={n.at} className="worked">
          <summary>
            <b>{new Date(n.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</b>{' '}
            <span className="faint small">– {n.text.slice(0, 80)}{n.text.length > 80 ? '…' : ''}</span>
          </summary>
          <p style={{ whiteSpace: 'pre-wrap' }}>{n.text}</p>
          <button className="btn btn-sm btn-danger" onClick={() => void save(notes.filter((x) => x.at !== n.at))}><Icon name="trash" size={14} /> Delete</button>
        </details>
      ))}
    </div>
  );
}
