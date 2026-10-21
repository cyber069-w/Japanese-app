/** The imported lessons of one CFA topic: Learn (guided), PDF (original) and Practise – plus loading the lesson PDFs. */
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../core/store';
import { syncConfigured } from '../../core/sync';
import { navigate } from '../../lib/router';
import { Icon } from '../../components/Icon';
import { LessonPdfButton } from './LessonPdf';
import { practiceLesson } from './Learn';
import { hasLocalPdf, loadPdfs, localPdfKeys } from './pdfs';

export function CfaTopicLessons({ topicId }: { topicId: string }) {
  const all = useApp((s) => s.content.cfaLessons);
  const lessons = all.filter((l) => l.topic === topicId).sort((a, b) => (a.module ?? 0) - (b.module ?? 0));
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void localPdfKeys().then(setKeys);
  }, []);

  const load = async (files: File[]) => {
    setMsg(`Loading ${files.length} file${files.length === 1 ? '' : 's'}…`);
    const r = await loadPdfs(files, all, (n) => setMsg(`Loading… ${n} of ${files.length}`));
    setKeys(await localPdfKeys());
    const parts = [`${r.saved.length} PDF${r.saved.length === 1 ? '' : 's'} saved on this device.`];
    if (r.synced) parts.push(`${r.synced} copied (encrypted) to your sync repo – your other devices download each one the first time you open it.`);
    else if (!syncConfigured()) parts.push('Device sync is off, so they stay on this device only.');
    if (r.syncError) parts.push(`Sync copy stopped: ${r.syncError}`);
    if (r.unknown.length) parts.push(`Not matched to a lesson: ${r.unknown.join(', ')}.`);
    setMsg(parts.join(' '));
  };

  if (!lessons.length) {
    return (
      <div className="card card-pad">
        <p className="muted small" style={{ marginBottom: 12 }}>No lessons imported for this topic yet.</p>
        <button className="btn btn-primary" onClick={() => navigate('/m/cfa/t/import')}>Import a lesson</button>
      </div>
    );
  }

  return (
    <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
      <div className="card card-pad">
        {lessons.map((l) => (
          <div className="mod-row lesson-row" key={l.id}>
            <span className="serif">{l.module ?? '·'}</span>
            <span>
              <b>{l.title}</b>
              <span className="faint small">
                {' '}· {l.terms.length} terms · {l.questions.length} questions{hasLocalPdf(keys, l) ? ' · PDF on this device' : ''}
              </span>
            </span>
            <span className="row lesson-actions">
              {l.learn && (
                <button className="btn btn-sm btn-primary" onClick={() => navigate(`/learn/${l.id}`)}><Icon name="book" size={16} /> Learn</button>
              )}
              <LessonPdfButton lesson={l} />
              <button className="btn btn-sm" onClick={() => practiceLesson(l)}><Icon name="cards" size={16} /> Practise</button>
            </span>
          </div>
        ))}
      </div>
      <div className="card card-pad stack" style={{ '--gap': '10px' } as React.CSSProperties}>
        <h3>Lesson PDFs</h3>
        <p className="muted small">
          Load the original lesson PDFs once (pick all files at the same time). They stay private: they are stored on this device and, with device
          sync on, copied encrypted to your sync repo, so your phone and iPad fetch each PDF once and then keep it offline.
        </p>
        <div>
          <button className="btn" onClick={() => input.current?.click()}><Icon name="upload" size={16} /> Load lesson PDFs</button>
          <input ref={input} type="file" accept=".pdf,application/pdf" multiple hidden onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; if (f.length) void load(f); }} />
        </div>
        {msg && <div className="notice small">{msg}</div>}
      </div>
    </div>
  );
}
