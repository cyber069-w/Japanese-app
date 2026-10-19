/** Settings → Connections (status of every outside source) and History (what the app did for you). */
import { useEffect, useState } from 'react';
import { useCanvas } from '../core/canvas';
import { loadCalendar } from '../core/calendar';
import { useSyncStatus } from '../core/sync';
import { azureConn, canvasConn, syncConn, timetableConn, type Conn } from '../core/connections';
import { loadAzure, saveAzure, type AzureSource } from '../core/azure';
import { clearHistory, deleteEntry, filterHistory, HISTORY_KINDS, useHistory, type HistoryKind } from '../core/history';
import { Icon } from '../components/Icon';
import { useStored } from '../core/kv';
import { ruleStats, type RuleLog } from '../core/rules';
import type { ExamRecordData } from '../components/home/ExamRecord';
import { updateSettings, useApp } from '../core/store';
import { downloadIcs } from '../lib/ics';
import { shutdownReminders } from '../lib/shutdownReminders';

const TAG: Record<Conn['state'], [string, string]> = { working: ['Working', 'tag-good'], stale: ['Stale', 'tag-warn'], off: ['Not set up', ''], failed: ['Failed', 'tag-bad'] };

export function ConnectionsSettings() {
  const canvas = useCanvas();
  const sync = useSyncStatus();
  const [cal, setCal] = useState<{ at?: number; n: number }>({ n: 0 });
  const [reportAt, setReportAt] = useState<string>();
  const [azure, setAzure] = useState<{ present: boolean; source: AzureSource }>({ present: false, source: null });
  const [form, setForm] = useState({ key: '', region: 'westeurope' });
  const reloadAzure = () => void loadAzure().then((a) => setAzure({ present: !!a.config, source: a.source }));
  useEffect(() => {
    void loadCalendar().then((c) => setCal({ at: c?.importedAt, n: c?.events.length ?? 0 }));
    void fetch('canvas-report.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => setReportAt(j?.at), () => {});
    reloadAzure();
  }, []);

  const now = Date.now();
  const rows = [
    canvasConn(canvas.inbox?.at, canvas.source, reportAt, canvas.error, now),
    timetableConn(cal.at, cal.n, now),
    syncConn(sync.phase, sync.lastSync, sync.error, sync.repo, now),
    azureConn(azure.present, azure.source),
  ];
  return (
    <section className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties} id="connections">
      <h2>Connections</h2>
      {rows.map((r) => (
        <div key={r.name} className="setting">
          <div className="setting-text">
            <b>{r.name}</b>
            <span>{r.detail}</span>
            {r.fix && r.state !== 'working' && <span className="faint">{r.state === 'off' || r.state === 'stale' || r.state === 'failed' ? ` → ${r.fix}` : null}</span>}
          </div>
          <span className={`tag ${TAG[r.state][1]}`}>{TAG[r.state][0]}</span>
        </div>
      ))}
      <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        <b className="small">Azure Speech key (stored on this device only)</b>
        <div className="row">
          <input className="input" type="password" autoComplete="off" placeholder="Key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} aria-label="Azure Speech key" style={{ width: 'min(100%, 260px)' }} />
          <input className="input" placeholder="Region, e.g. westeurope" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} aria-label="Azure region" style={{ width: 'min(100%, 180px)' }} />
          <button className="btn btn-sm" disabled={!form.key.trim() || !form.region.trim()} onClick={async () => { await saveAzure({ key: form.key.trim(), region: form.region.trim() }); setForm({ ...form, key: '' }); reloadAzure(); }}>Save</button>
          {azure.source === 'device' && <button className="btn btn-sm btn-ghost" onClick={async () => { await saveAzure(null); reloadAzure(); }}>Remove</button>}
        </div>
      </div>
    </section>
  );
}

const KIND_LABEL: Record<string, string> = { deadline: 'Canvas deadlines (accepted)', suggestion: 'New Canvas deadlines', announcement: 'Announcements', cards: 'Due cards', file: 'New files', notes: 'New notes', lecture: 'Next lecture', gap: 'Focus gaps', application: 'Application dates', club: 'Club items', warmup: 'Daily warm-up' };

/** How the "What to do next" rules perform: acted / dismissed / ignored per rule type. */
function RuleStats() {
  const [log] = useStored<RuleLog>('rules:log', {});
  const [records] = useStored<Record<string, ExamRecordData>>('exams:records', {});
  const stats = ruleStats(log);
  return (
    <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
      <b className="small">Suggestion outcomes</b>
      {stats.length === 0 ? <div className="muted small">Nothing measured yet – the list on Home logs what you do with each suggestion.</div> : (
        <table className="small" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr className="faint"><th align="left">Rule</th><th align="right">Shown</th><th align="right">Done</th><th align="right">Dismissed</th><th align="right">Ignored</th><th align="right">Dismiss rate</th></tr></thead>
          <tbody>{stats.map((s) => <tr key={s.kind}><td>{KIND_LABEL[s.kind] ?? s.kind}</td><td align="right">{s.total}</td><td align="right">{s.acted}</td><td align="right">{s.dismissed}</td><td align="right">{s.ignored}</td><td align="right">{s.dismissRate === null ? '–' : `${Math.round(s.dismissRate * 100)}%`}</td></tr>)}</tbody>
        </table>
      )}
      {Object.keys(records).length > 0 && <div className="small">Exam record: {Object.entries(records).map(([c, r]) => `${c} ${r.grade}${r.prepStart ? ` (prep from ${r.prepStart})` : ''}`).join(' · ')}</div>}
    </div>
  );
}

export function HistorySettings() {
  const all = useHistory();
  const [kind, setKind] = useState<HistoryKind | 'all'>('all');
  const [q, setQ] = useState('');
  const list = filterHistory(all, kind, q);
  return (
    <section className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties} id="history">
      <div className="row">
        <h2>History</h2>
        <span className="faint tiny">{all.length} of the last 300 actions</span>
        <span className="spacer" />
        {all.length > 0 && <button className="btn btn-sm btn-danger" onClick={() => confirm('Clear the whole history?') && clearHistory()}>Clear all</button>}
      </div>
      <RuleStats />
      <div className="row">
        <input className="input" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search history" style={{ width: 'min(100%, 220px)' }} />
        <button className={`chip${kind === 'all' ? ' on' : ''}`} onClick={() => setKind('all')}>All</button>
        {(Object.keys(HISTORY_KINDS) as HistoryKind[]).map((k) => (
          <button key={k} className={`chip${kind === k ? ' on' : ''}`} onClick={() => setKind(k)}>{HISTORY_KINDS[k]}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="muted small">{all.length ? 'Nothing matches.' : 'Nothing yet – deadlines you accept, prompts you copy, focus entries and imports show up here.'}</div>
      ) : (
        <ul className="today-list">
          {list.slice(0, 100).map((e) => (
            <li key={e.id} className="today-row">
              <span className="today-time">{new Date(e.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <div className="grow"><span className="tag" style={{ marginRight: 8 }}>{HISTORY_KINDS[e.kind]}</span>{e.text}</div>
              <button className="btn btn-sm btn-ghost" aria-label="Delete entry" onClick={() => deleteEntry(e.id)}><Icon name="x" size={15} /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const DAYS: Array<[string, string]> = [['1', 'Mon'], ['2', 'Tue'], ['3', 'Wed'], ['4', 'Thu'], ['5', 'Fri'], ['6', 'Sat'], ['0', 'Sun']];

/** Settings → Evening shutdown: time per weekday, iA Writer folder, calendar reminders. */
export function ShutdownSettings() {
  const s = useApp((st) => st.settings);
  return (
    <section className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties} id="shutdown-settings">
      <h2>Evening shutdown</h2>
      <p className="muted small" style={{ margin: 0 }}>The reminder time per weekday. On a later night just snooze the alert in Calendar.</p>
      <div className="row">
        {DAYS.map(([k, label]) => (
          <label key={k} className="stack tiny" style={{ '--gap': '4px' } as React.CSSProperties}>
            <span className="faint">{label}</span>
            <input className="input" type="time" value={s.shutdownTimes[k] ?? '22:30'} style={{ width: 112 }}
              onChange={(e) => updateSettings({ shutdownTimes: { ...s.shutdownTimes, [k]: e.target.value || '22:30' } })} aria-label={`Shutdown time ${label}`} />
          </label>
        ))}
      </div>
      <div className="row">
        <button className="btn" onClick={() => downloadIcs(shutdownReminders(s.shutdownTimes, Date.now(), `${location.origin}${location.pathname}#/shutdown`), 'shutdown-reminders.ics')}>Add shutdown reminders to Calendar</button>
        <span className="faint tiny">Repeating events, 15 min, alert at start; the link opens the shutdown screen. Importing again replaces them.</span>
      </div>
      <div className="setting">
        <div className="setting-text"><b>iA Writer folder</b><span>Notes are created at /folder/YYYY-MM-DD.md.</span></div>
        <input className="input" style={{ width: 'min(100%, 200px)' }} value={s.iaFolder} onChange={(e) => updateSettings({ iaFolder: e.target.value })} aria-label="iA Writer folder" />
      </div>
      <div className="setting">
        <div className="setting-text"><b>One note per day</b><span>Off: one running note called Shutdown.md.</span></div>
        <label className="switch"><input type="checkbox" checked={s.iaOnePerDay} onChange={(e) => updateSettings({ iaOnePerDay: e.target.checked })} aria-label="One note per day" /><span /></label>
      </div>
    </section>
  );
}
