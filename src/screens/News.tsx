/** News tab: one line per headline, grouped by source, collapsed by default. Headlines only (Mac job reads the RSS feeds). */
import { useStored } from '../core/kv';
import { useCanvas } from '../core/canvas';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';

export function NewsTab({ onSave }: { onSave: (title: string, link: string, source: string) => void }) {
  const { inbox } = useCanvas();
  const [dismissed, setDismissed] = useStored<string[]>('news:dismissed', []);
  const [saved, setSaved] = useStored<string[]>('news:saved', []);
  const news = inbox?.news ?? [];
  if (!news.length) return <EmptyState icon="list" title="No headlines yet" hint="The Mac job reads your feeds once a day (sources in private/news-config.json)." />;
  const age = inbox?.at ? new Date(inbox.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '–';
  return (
    <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
      <div className="faint tiny">Headlines only, as of {age}. Nothing is summarised.</div>
      {news.map((s) => {
        const items = s.items.filter((i) => !dismissed.includes(i.link));
        return (
          <details key={s.source} className="glass">
            <summary><b>{s.source}</b> <span className="faint tiny">{s.error ? 'feed unavailable' : `${items.length} headline${items.length === 1 ? '' : 's'}`}</span></summary>
            {s.error ? <div className="muted small" style={{ marginTop: 8 }}>feed unavailable – {s.error}</div> : (
              <ul className="today-list">
                {items.map((i) => (
                  <li key={i.link} className="today-row">
                    <div className="grow small">{i.title}<div className="today-meta">{i.date ? new Date(i.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</div></div>
                    <a className="btn btn-sm btn-ghost" href={i.link} target="_blank" rel="noreferrer">Open</a>
                    <button className="btn btn-sm btn-ghost" disabled={saved.includes(i.link)} onClick={() => { onSave(i.title, i.link, s.source); setSaved([...saved, i.link]); }}>{saved.includes(i.link) ? 'Saved' : 'Save'}</button>
                    <button className="btn btn-sm btn-ghost" aria-label="Dismiss" onClick={() => setDismissed([...dismissed, i.link])}><Icon name="x" size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </details>
        );
      })}
    </div>
  );
}
