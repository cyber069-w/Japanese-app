/** Stats → Weekly report: per subject focus, lectures, cards and Canvas numbers; PDF via print, Markdown download. */
import { useState } from 'react';
import { useWeeklyReport } from './useReport';
import { useToday } from './todayData';
import { PlanSheet } from './home/PlanSheet';
import { Icon } from './Icon';

const h1 = (h: number) => `${(Math.round(h * 10) / 10).toFixed(1)} h`;

export function WeeklyReport() {
  const [offset, setOffset] = useState(0);
  const [msg, setMsg] = useState('');
  const { report, md } = useWeeklyReport(offset);
  const t = useToday();
  const [planning, setPlanning] = useState(false);
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = `week-${report.weekStart}.md`;
    a.click();
  };
  const print = () => {
    document.body.classList.add('print-report');
    window.addEventListener('afterprint', () => document.body.classList.remove('print-report'), { once: true });
    window.print();
  };
  const copy = async () => setMsg((await navigator.clipboard?.writeText(md).then(() => true, () => false)) ? 'Copied – paste it into your planning chat.' : 'Copy was blocked – use the download.');

  return (
    <div className="section report" id="weekly-report">
      <div className="section-head no-print">
        <h2>Weekly report</h2>
        <span className="spacer" />
        <div className="row">
          <button className={`chip${offset === 0 ? ' on' : ''}`} onClick={() => setOffset(0)}>This week</button>
          <button className={`chip${offset === -1 ? ' on' : ''}`} onClick={() => setOffset(-1)}>Last week</button>
        </div>
      </div>
      <div className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <b>{report.weekStart} – {report.weekEnd}</b>
        {report.rows.length === 0 ? (
          <div className="muted small">Nothing logged in this week.</div>
        ) : (
          <div className="table-wrap">
            <table className="small" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr className="faint"><th align="left">Subject</th><th align="right">Focus</th><th align="right">Reading</th><th align="right">Target</th><th align="right">Lectures</th><th align="right">Cards</th><th align="right">Accuracy</th></tr></thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.subject}>
                    <td>{r.subject}</td><td align="right">{h1(r.hours)}</td><td align="right">{r.reading ? h1(r.reading) : '–'}</td><td align="right">{r.target ? h1(r.target) : '–'}</td>
                    <td align="right">{r.lectures}</td><td align="right">{r.answers}</td><td align="right">{r.answers ? `${Math.round((r.correct / r.answers) * 100)}%` : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="small muted">
          Canvas: {report.deadlinesDue} deadline{report.deadlinesDue === 1 ? '' : 's'} due this week · {report.deadlinesOpen} accepted and still open · {report.newFiles} new file{report.newFiles === 1 ? '' : 's'}.
          {' '}“Finished” isn’t tracked – Canvas only tells the app what is still open.
        </div>
        <div className="row no-print">
          <button className="btn btn-sm" onClick={print}><Icon name="download" size={15} /> PDF (print)</button>
          <button className="btn btn-sm" onClick={download}><Icon name="download" size={15} /> Markdown</button>
          <button className="btn btn-sm" onClick={() => void copy()}><Icon name="copy" size={15} /> Copy for planning chat</button>
          <button className="btn btn-sm btn-primary" onClick={() => setPlanning(true)}><Icon name="sparkle" size={15} /> Plan next week with Claude</button>
          {msg && <span className="faint tiny" role="status">{msg}</span>}
        </div>
      </div>
      {planning && <PlanSheet t={t} report={md} onClose={() => setPlanning(false)} />}
    </div>
  );
}
