/** Every formula and worked example from your CFA lessons on one page, by topic – searchable and printable. */
import { useMemo, useState } from 'react';
import type { StudyContext } from '../../core/types';
import { Icon } from '../../components/Icon';
import { CFA_TOPIC_NAMES } from './lessons';

export function FormulaSheet({ ctx }: { ctx: StudyContext }) {
  const [q, setQ] = useState('');
  const lessons = ctx.content.cfaLessons;
  const byTopic = useMemo(() => {
    const s = q.trim().toLowerCase();
    const hit = (t: string) => !s || t.toLowerCase().includes(s);
    const map = new Map<string, typeof lessons>();
    for (const l of [...lessons].sort((a, b) => (a.module ?? 0) - (b.module ?? 0))) {
      const formulas = l.formulas.filter((f) => hit(`${f.name} ${f.formula} ${f.note ?? ''} ${l.title}`));
      const examples = (l.examples ?? []).filter((x) => hit(`${x.title} ${x.problem} ${x.solution} ${l.title}`));
      if (!formulas.length && !examples.length) continue;
      map.set(l.topic, [...(map.get(l.topic) ?? []), { ...l, formulas, examples }]);
    }
    return [...map.entries()];
  }, [lessons, q]);

  if (!lessons.length) return <div className="empty">No lessons yet – import one under “Import lesson”.</div>;

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <div className="row no-print">
        <input className="input" style={{ flex: '1 1 220px' }} placeholder="Search formulas and examples…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <button className="btn" onClick={() => window.print()}><Icon name="download" size={16} /> Print / PDF</button>
      </div>
      {byTopic.length === 0 && <div className="empty">Nothing found.</div>}
      {byTopic.map(([topic, list]) => (
        <section key={topic} className="card card-pad stack" style={{ '--gap': '14px' } as React.CSSProperties}>
          <h2>{CFA_TOPIC_NAMES[topic] ?? topic}</h2>
          {list.map((l) => (
            <div key={l.id} className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
              <div className="eyebrow">{l.module ? `Module ${l.module} · ` : ''}{l.title}</div>
              {l.formulas.map((f) => (
                <div key={f.name} className="formula-row">
                  <b>{f.name}</b>
                  <code>{f.formula}</code>
                  {f.note && <span className="faint small">{f.note}</span>}
                </div>
              ))}
              {(l.examples ?? []).map((x) => (
                <details key={x.problem} className="worked">
                  <summary><b>{x.title || 'Worked example'}</b> <span className="faint small">– {x.problem}</span></summary>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{x.solution}</p>
                </details>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
