/** Lecture timetable from an Outlook .ics file; one tap starts a lecture session. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { loadCalendar, occurrences, parseIcs, saveCalendar, subjectOf, type CalendarData } from '../core/calendar';

const dayLabel = (ms: number) => {
  const d = new Date(ms);
  const t = new Date();
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 86400_000);
  return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
};
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export function Lectures({ onStart, busy }: { onStart: (subject: string) => void; busy: boolean }) {
  const [cal, setCal] = useState<CalendarData | null>(null);
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadCalendar().then((c) => {
      setCal(c ?? null);
      if (c?.url) setUrl(c.url);
    });
  }, []);

  const store = (text: string, source: string, from?: string) => {
    const events = parseIcs(text);
    if (!events.length) return setMsg('No events found – is that an .ics calendar file?');
    const data: CalendarData = { events, source, importedAt: Date.now(), url: from };
    setCal(data);
    void saveCalendar(data);
    setMsg(`Imported ${events.length} events from ${source}.`);
  };
  const fromUrl = async () => {
    try {
      const res = await fetch(url.trim());
      if (!res.ok) throw new Error(String(res.status));
      store(await res.text(), 'calendar link', url.trim());
    } catch {
      setMsg('The link could not be loaded from the browser (Outlook usually blocks this). Download the .ics file and import it instead.');
    }
  };

  const upcoming = useMemo(() => {
    if (!cal) return [];
    const from = new Date().setHours(0, 0, 0, 0);
    return occurrences(cal.events, from, from + 7 * 86400_000).filter((o) => !o.allDay && o.end > Date.now());
  }, [cal]);

  const byDay = new Map<string, typeof upcoming>();
  upcoming.forEach((o) => byDay.set(dayLabel(o.start), [...(byDay.get(dayLabel(o.start)) ?? []), o]));

  return (
    <div className="section">
      <div className="section-head"><h2>Lectures this week</h2></div>
      <div className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        {byDay.size === 0 ? (
          <p className="muted small">{cal ? 'No lectures in the next 7 days.' : 'Import your timetable to see your lectures here and start a lecture session with one tap.'}</p>
        ) : (
          [...byDay.entries()].map(([day, list]) => (
            <div key={day}>
              <div className="eyebrow" style={{ margin: '0 0 6px' }}>{day}</div>
              {list.map((o) => (
                <div className="setting" key={`${o.uid}-${o.start}`}>
                  <div className="setting-text">
                    <b>{o.title}</b>
                    <span>{hhmm(o.start)}–{hhmm(o.end)}{o.location ? ` · ${o.location}` : ''}</span>
                  </div>
                  <button className="btn btn-sm" disabled={busy} onClick={() => onStart(subjectOf(o.title))}>
                    <Icon name="play" size={14} /> Start
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
        <details>
          <summary className="small muted" style={{ cursor: 'pointer' }}>{cal ? `Update timetable (last import ${new Date(cal.importedAt).toLocaleDateString()})` : 'Import timetable'}</summary>
          <div className="stack" style={{ '--gap': '10px', marginTop: 10 } as React.CSSProperties}>
            <p className="muted small">
              In Outlook on the web: Settings → Calendar → Shared calendars → Publish a calendar → copy the <b>ICS</b> link and download it in your browser, or export your calendar as .ics. Recurring lectures are expanded automatically.
            </p>
            <div className="row">
              <button className="btn" onClick={() => file.current?.click()}><Icon name="upload" size={16} /> Choose .ics file</button>
              <input ref={file} type="file" accept=".ics,text/calendar" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) store(await f.text(), f.name); }} />
            </div>
            <div className="row">
              <input className="input" style={{ flex: '1 1 240px' }} placeholder="…or paste the ICS link" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="ICS link" />
              <button className="btn" onClick={fromUrl} disabled={!url.trim()}>Load link</button>
            </div>
            {cal && <div><button className="btn btn-sm btn-danger" onClick={() => { setCal(null); void saveCalendar(null); setMsg('Timetable removed.'); }}><Icon name="trash" size={14} /> Remove timetable</button></div>}
          </div>
        </details>
        {msg && <div className="notice good small">{msg}</div>}
      </div>
    </div>
  );
}
