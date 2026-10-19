/** After an exam: ask for the real grade and when serious preparation started (feeds the "measure the rules" record). */
import { useState } from 'react';
import { useApp } from '../../core/store';
import { useStored } from '../../core/kv';
import { COURSES } from '../../courses';
import { daysUntil } from '../../lib/date';
import { Sheet } from '../Sheet';
import { Icon } from '../Icon';

export interface ExamRecordData { grade: string; prepStart: string; at: number }

export function ExamRecordBanner() {
  const settings = useApp((s) => s.settings);
  const [records, setRecords, loaded] = useStored<Record<string, ExamRecordData>>('exams:records', {});
  const [open, setOpen] = useState<string | null>(null);
  const [grade, setGrade] = useState(''), [prep, setPrep] = useState('');
  if (!loaded) return null;
  const due = COURSES.find((c) => { const d = settings.examDates?.[c.id]; return d && daysUntil(d) < 0 && daysUntil(d) >= -60 && !records[c.id]; });
  if (!due) return null;
  return (
    <>
      <div className="glass shutdown-banner"><Icon name="exam" size={18} /><b className="grow">How did the {due.name} exam go? Add the real grade for your record.</b><button className="btn btn-sm btn-primary" onClick={() => setOpen(due.id)}>Add grade</button></div>
      {open && (
        <Sheet title={`${due.name} – exam record`} onClose={() => setOpen(null)}>
          <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
            <label className="stack small" style={{ '--gap': '4px' } as React.CSSProperties}><span className="faint">Real grade</span><input className="input" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. 5.0" /></label>
            <label className="stack small" style={{ '--gap': '4px' } as React.CSSProperties}><span className="faint">When did serious preparation start?</span><input className="input" type="date" value={prep} onChange={(e) => setPrep(e.target.value)} /></label>
            <div className="row"><button className="btn btn-primary" disabled={!grade.trim()} onClick={() => { setRecords({ ...records, [due.id]: { grade: grade.trim(), prepStart: prep, at: Date.now() } }); setOpen(null); }}>Save</button><button className="btn btn-ghost" onClick={() => { setRecords({ ...records, [due.id]: { grade: '–', prepStart: '', at: Date.now() } }); setOpen(null); }}>Skip</button></div>
          </div>
        </Sheet>
      )}
    </>
  );
}
