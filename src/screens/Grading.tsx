/** Overnight grading (#/grading): queue free-text answers; the Mac job grades them with Claude Code and the feedback arrives next morning. */
import { useEffect, useState } from 'react';
import { useStored } from '../core/kv';
import { markSeen, useCanvas } from '../core/canvas';
import { logHistory } from '../core/history';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';

export interface GradingItem { id: string; subject: string; question: string; context: string; answer: string; at: number }

export function Grading() {
  const [queue, setQueue] = useStored<GradingItem[]>('grading:queue', []);
  const { inbox } = useCanvas();
  const [f, setF] = useState({ subject: '', question: '', context: '', answer: '' });
  const results = new Map((inbox?.gradings ?? []).map((g) => [g.id, g]));
  useEffect(() => { if (inbox?.gradings?.length) markSeen(inbox.gradings.map((g) => `g-${g.id}`)); }, [inbox?.gradings]);
  const add = () => {
    if (!f.question.trim() || !f.answer.trim()) return;
    setQueue([{ id: `g${Date.now()}`, ...f, at: Date.now() }, ...queue]);
    logHistory('tutor', `Queued for overnight grading: ${f.question.slice(0, 60)}`);
    setF({ ...f, question: '', answer: '' });
  };
  const field = (label: string, el: React.ReactNode) => <label className="stack small" style={{ '--gap': '4px' } as React.CSSProperties}><span className="faint">{label}</span>{el}</label>;
  return (
    <div className="page">
      <div className="page-head"><div className="grow"><h1>Overnight grading</h1><div className="muted" style={{ marginTop: 4 }}>Write an answer to a question, add the slide text it should match, and queue it. The Mac job grades it with Claude Code overnight; the feedback shows up on Home.</div></div></div>
      <div className="bento">
        <section className="glass" style={{ gridColumn: 'span 6' }}>
          <div className="glass-head"><h2>New answer</h2></div>
          <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
            {field('Subject', <input className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="e.g. BWL" />)}
            {field('Question', <input className="input" value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} />)}
            {field('Reference (slide text or key points)', <textarea className="input" style={{ minHeight: 90 }} value={f.context} onChange={(e) => setF({ ...f, context: e.target.value })} />)}
            {field('Your answer', <textarea className="input" style={{ minHeight: 120 }} value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} />)}
            <div className="row"><button className="btn btn-primary" onClick={add} disabled={!f.question.trim() || !f.answer.trim()}>Queue for tonight</button></div>
            <div className="faint tiny">Needs the Mac job with “claude.enabled” in private/canvas-config.json and device sync set up. Without them, the answer just waits.</div>
          </div>
        </section>
        <section className="glass" style={{ gridColumn: 'span 6' }}>
          <div className="glass-head"><h2>Queue and feedback</h2></div>
          {queue.length === 0 ? <EmptyState icon="list" title="Nothing queued" hint="Answers you queue appear here with their feedback." /> : (
            <ul className="today-list">
              {queue.map((q) => {
                const r = results.get(q.id);
                return (
                  <li key={q.id} className="today-row" style={{ flexWrap: 'wrap' }}>
                    <div className="grow"><div className="today-title">{q.question}</div><div className="today-meta">{q.subject || '–'} · {r ? `scored ${r.score}/10` : 'waiting for tonight’s job'}</div>{r && <p className="small" style={{ margin: '6px 0 0' }}>{r.feedback}</p>}</div>
                    <button className="btn btn-sm btn-ghost" aria-label="Remove" onClick={() => setQueue(queue.filter((x) => x.id !== q.id))}><Icon name="x" size={14} /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
