/**
 * The Canvas bell: deadline suggestions (accept / ignore), filtered announcements and newly fetched
 * files. Can be muted completely or per subject.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import {
  accept, ignore, inboxView, initCanvas, isImportant, markSeen, openInbox, toggleMute, toggleSubject, useCanvas, type CanvasAnnouncement, type CanvasDeadline,
} from '../core/canvas';

const DAY = 86_400_000;
function due(d: CanvasDeadline) {
  if (!d.due) return 'no date';
  const t = Date.parse(d.due);
  const days = Math.round((new Date(t).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY);
  const when = new Date(t).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  if (t < Date.now()) return `overdue · ${when}`;
  return `${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`} · ${when}`;
}

export function InboxBell() {
  const s = useCanvas();
  useEffect(initCanvas, []);
  const v = inboxView(s);
  if (!v.available) return null;
  return (
    <>
      <button className={`inbox-bell${s.prefs.muted ? ' muted' : ''}`} onClick={() => openInbox()} aria-label={`Canvas inbox${v.badge ? `, ${v.badge} new` : ''}`} title="Canvas inbox">
        <Icon name="bell" size={19} />
        {v.badge > 0 && <span className="inbox-badge">{v.badge > 9 ? '9+' : v.badge}</span>}
      </button>
      {s.open && <InboxSheet />}
    </>
  );
}

function InboxSheet() {
  const s = useCanvas();
  const v = inboxView(s);
  const [all, setAll] = useState(false);
  const [settings, setSettings] = useState(false);
  const subjects = useMemo(() => [...new Set([...(s.inbox?.deadlines ?? []), ...(s.inbox?.announcements ?? [])].map((x) => x.subject).filter(Boolean))].sort(), [s.inbox]);
  const shown: CanvasAnnouncement[] = all ? v.announcements : v.important;
  // what you saw once doesn't count again (marked when the sheet closes)
  const seenRef = useRef<string[]>([]);
  seenRef.current = v.important.map((a) => a.id);
  useEffect(() => () => markSeen(seenRef.current), []);

  return (
    <Sheet title={<span className="row" style={{ gap: 8 }}><Icon name="bell" size={18} /> Canvas</span>} onClose={() => openInbox(false)}>
      <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
        <section className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <div className="eyebrow">Deadlines – suggestions</div>
          {v.suggestions.length === 0 && <div className="faint small">No new deadlines.</div>}
          {v.suggestions.map((d) => (
            <div key={d.id} className="inbox-row">
              <div className="grow">
                <b>{d.title}</b>
                <div className="faint tiny">{d.course} · {due(d)}</div>
              </div>
              <button className="btn btn-sm btn-primary" onClick={() => accept(d.id)}>Add</button>
              <button className="btn btn-sm btn-ghost" onClick={() => ignore(d.id)}>Ignore</button>
            </div>
          ))}
        </section>

        {v.accepted.length > 0 && (
          <section className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
            <div className="eyebrow">Your deadlines</div>
            {v.accepted.map((d) => (
              <div key={d.id} className={`inbox-row${v.soon.includes(d) ? ' soon' : ''}`}>
                <div className="grow">
                  <b>{d.title}</b>
                  <div className="faint tiny">{d.course} · {due(d)}</div>
                </div>
                {d.url && <a className="btn btn-sm btn-ghost" href={d.url} target="_blank" rel="noreferrer">Canvas</a>}
                <button className="icon-btn" aria-label={`Remove ${d.title}`} onClick={() => ignore(d.id)}><Icon name="x" size={15} /></button>
              </div>
            ))}
          </section>
        )}

        <section className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="eyebrow">Announcements{all ? '' : ' – important only'}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setAll(!all)}>{all ? 'Important only' : `Show all (${v.announcements.length})`}</button>
          </div>
          {shown.length === 0 && <div className="faint small">Nothing important in the last 30 days.</div>}
          {shown.slice(0, 20).map((a) => (
            <details key={a.id} className={`inbox-ann${!s.prefs.seen.includes(a.id) && isImportant(a) ? ' unseen' : ''}`}>
              <summary>
                <b>{a.title}</b>
                <span className="faint tiny"> · {a.course} · {new Date(a.posted).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              </summary>
              <p className="small">{a.text}</p>
              {a.url && <a className="small" href={a.url} target="_blank" rel="noreferrer">Open in Canvas</a>}
            </details>
          ))}
        </section>

        {v.files.length > 0 && (
          <section className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
            <div className="eyebrow">New files in your folders</div>
            {v.files.slice(0, 12).map((f) => (
              <div key={f.id} className="small">
                <b>{f.file}</b> <span className="faint tiny">→ {f.to.split('/').slice(0, -1).join(' / ')}</span>
              </div>
            ))}
            {v.files.length > 12 && <div className="faint tiny">… and {v.files.length - 12} more</div>}
          </section>
        )}

        <section className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button className="btn btn-sm" onClick={toggleMute}><Icon name={s.prefs.muted ? 'speaker' : 'sound'} size={15} /> {s.prefs.muted ? 'Unmute the bell' : 'Mute the bell'}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSettings(!settings)}>Mute subjects</button>
          </div>
          {settings && (
            <div className="picker-chips">
              {subjects.map((sub) => {
                const off = s.prefs.mutedSubjects.includes(sub);
                return (
                  <button key={sub} className={`chip${off ? '' : ' on'}`} aria-pressed={!off} onClick={() => toggleSubject(sub)}>
                    {off ? 'muted · ' : ''}{sub}
                  </button>
                );
              })}
            </div>
          )}
          <div className="faint tiny">Updated {s.inbox ? new Date(s.inbox.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–'} · fetched daily at 7:00 on your Mac</div>
        </section>
      </div>
    </Sheet>
  );
}
