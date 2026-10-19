import { useApp } from '../../core/store';
import { useStored } from '../../core/kv';
import { shutdownDay, shutdownNudge, type ShutdownLog } from '../../core/shutdown';
import { Icon } from '../Icon';

/** Home banner: shutdown not done yet / just your top 3 (late) / yesterday missed. */
export function ShutdownBanner() {
  const times = useApp((s) => s.settings.shutdownTimes);
  const [log] = useStored<ShutdownLog>('shutdown:log', {});
  const [dismissed, setDismissed] = useStored<string>('shutdown:dismissed', '');
  const now = Date.now();
  const nudge = shutdownNudge(now, times, log, dismissed);
  if (!nudge) return null;
  const text = nudge === 'due' ? 'Shutdown not done yet – 3 min' : nudge === 'late' ? 'Just your top 3 (60 s)' : 'Yesterday’s shutdown was missed – quick version?';
  return (
    <div className="glass shutdown-banner" role="status">
      <Icon name="clock" size={18} />
      <b className="grow">{text}</b>
      <a className="btn btn-sm btn-primary" href={nudge === 'due' ? '#/shutdown' : '#/shutdown/quick'}>{nudge === 'due' ? 'Start' : 'Quick version'}</a>
      {nudge === 'missed' && <button className="btn btn-sm btn-ghost" onClick={() => setDismissed(shutdownDay(now))} aria-label="Dismiss">Dismiss</button>}
    </div>
  );
}
