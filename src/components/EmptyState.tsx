import { Icon } from './Icon';

/** A calm "nothing here yet" with a hint and one optional action. */
export function EmptyState({ icon = 'sparkle', title, hint, action }: { icon?: string; title: string; hint?: string; action?: { label: string; href?: string; onClick?: () => void } }) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true"><Icon name={icon} size={22} /></span>
      <b>{title}</b>
      {hint && <span className="muted small">{hint}</span>}
      {action && (action.href ? <a className="btn btn-sm" href={action.href}>{action.label}</a> : <button className="btn btn-sm" onClick={action.onClick}>{action.label}</button>)}
    </div>
  );
}
