/** Import CFA lesson packs (JSON from Claude), copy the prompt, download everything. */
import { useMemo, useRef, useState } from 'react';
import type { StudyContext } from '../../core/types';
import { setCfaLessons } from '../../core/store';
import { Icon } from '../../components/Icon';
import { CFA_TOPIC_NAMES, LESSON_PROMPT, parseCfaLessons } from './lessons';

export function CfaImport({ ctx }: { ctx: StudyContext }) {
  const lessons = ctx.content.cfaLessons;
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => (text.trim() ? parseCfaLessons(text) : null), [text]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(LESSON_PROMPT);
      setMsg('Prompt copied. Paste it into Claude after your lesson notes.');
    } catch {
      setMsg('Copy failed – select the prompt text and copy it by hand.');
    }
  };
  const save = async () => {
    if (!parsed?.lessons.length) return;
    const ids = new Set(parsed.lessons.map((l) => l.id));
    await setCfaLessons([...lessons.filter((l) => !ids.has(l.id)), ...parsed.lessons]);
    setMsg(`Saved ${parsed.lessons.length} lesson${parsed.lessons.length === 1 ? '' : 's'}. Same title and module replace the older version.`);
    setText('');
  };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(lessons, null, 1)], { type: 'application/json' }));
    a.download = 'cfa-lessons.json';
    a.click();
  };

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <section className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <h2>1 · Get the pack from Claude</h2>
        <p className="muted small">After each lesson, send Claude your notes together with this prompt. It answers with one block of JSON.</p>
        <pre className="card" style={{ margin: 0, padding: 12, overflowX: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.8rem', background: 'var(--surface-2)' }}>{LESSON_PROMPT}</pre>
        <div><button className="btn" onClick={copyPrompt}><Icon name="copy" size={16} /> Copy prompt</button></div>
      </section>

      <section className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <h2>2 · Import it</h2>
        <div className="row">
          <button className="btn" onClick={() => file.current?.click()}><Icon name="upload" size={16} /> Choose .json file</button>
          <input ref={file} type="file" accept=".json,application/json,text/plain" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setText(await f.text()); }} />
        </div>
        <textarea className="input" placeholder="…or paste Claude’s answer here" value={text} onChange={(e) => setText(e.target.value)} aria-label="Lesson JSON" spellCheck={false} />
        {parsed && (
          <>
            {parsed.errors.length > 0 && <div className="notice warn small">{parsed.errors.slice(0, 5).map((e) => <div key={e}>{e}</div>)}</div>}
            {parsed.lessons.map((l) => (
              <div key={l.id} className="small"><b>{l.title}</b> <span className="muted">· {CFA_TOPIC_NAMES[l.topic] ?? l.topic} · {l.terms.length} terms, {l.formulas.length} formulas, {l.questions.length} questions</span></div>
            ))}
            {parsed.lessons.length > 0 && <div><button className="btn btn-primary" onClick={save}>Import {parsed.lessons.length} lesson{parsed.lessons.length === 1 ? '' : 's'}</button></div>}
          </>
        )}
        {msg && <div className="notice good small">{msg}</div>}
      </section>

      <section className="card card-pad">
        <div className="row" style={{ marginBottom: 6 }}>
          <h2 style={{ flex: '1 1 auto' }}>Your lessons</h2>
          {lessons.length > 0 && <button className="btn btn-sm" onClick={download}><Icon name="download" size={16} /> Download all (.json)</button>}
        </div>
        {lessons.length === 0 ? (
          <p className="muted small">No lessons yet.</p>
        ) : (
          lessons.map((l) => (
            <div className="setting" key={l.id}>
              <div className="setting-text">
                <b>{l.title}</b>
                <span>{CFA_TOPIC_NAMES[l.topic] ?? l.topic}{l.module ? ` · module ${l.module}` : ''} · {l.terms.length} terms · {l.formulas.length} formulas · {l.questions.length} questions</span>
              </div>
              <button className="btn btn-sm btn-danger" onClick={() => confirm(`Delete “${l.title}”? Your progress on it stays in the backup only.`) && setCfaLessons(lessons.filter((x) => x.id !== l.id))}>
                <Icon name="trash" size={16} /> Delete
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
