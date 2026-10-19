/** Daily 60-second warm-up: one random question per day, one take (no redo), streak and trend. */
import { useMemo } from 'react';
import type { StudyContext } from '../../core/types';
import { useStored } from '../../core/kv';
import { EmptyState } from '../../components/EmptyState';
import { SpokenFlow } from './SpokenFlow';
import { warmupDone, warmupPick, warmupStreak, type Attempt } from './stats';

function Trend({ points, label, color }: { points: number[]; label: string; color: string }) {
  if (points.length < 2) return <div className="faint tiny">{label}: needs two warm-ups.</div>;
  const max = Math.max(...points, 1), W = 220, H = 48;
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${(i / (points.length - 1)) * W},${H - (v / max) * (H - 6) - 3}`).join(' ');
  return (
    <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
      <div className="faint tiny">{label} · last {points.length}: {points[points.length - 1]}</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label={label}><path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  );
}

export function Warmup({ ctx }: { ctx: StudyContext }) {
  const [attempts] = useStored<Attempt[]>('interview:attempts', []);
  const now = Date.now();
  const q = useMemo(() => warmupPick(ctx.content.interviewQs ?? [], now), [ctx.content.interviewQs, now]);
  const warm = attempts.filter((a) => a.warmup).sort((a, b) => a.at - b.at).slice(-14);
  const done = warmupDone(attempts, now);
  const streak = warmupStreak(attempts, now);
  if (!q) return <EmptyState icon="chat" title="No questions yet" hint="Import an interview pack first." action={{ label: 'Import a pack', href: '#/m/interview/t/import' }} />;
  return (
    <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
      <div className="exam-chips" style={{ marginTop: 0 }}><span><b>{streak}</b> day warm-up streak</span><span>{done ? 'Today: done' : 'Today: open'}</span></div>
      {done ? <EmptyState icon="check" title="Warm-up done for today" hint="One take a day – come back tomorrow." /> : <SpokenFlow key={q.id} q={q} warmup />}
      <div className="card card-pad stack" style={{ '--gap': '10px' } as React.CSSProperties}>
        <b className="small">Trend</b>
        <Trend points={warm.map((a) => a.wpm)} label="Words per minute" color="var(--accent)" />
        <Trend points={warm.map((a) => a.fillersPerMin)} label="Fillers per minute" color="var(--warn)" />
      </div>
    </div>
  );
}
