import { downloadIcs, type IcsEvent } from '../lib/ics';
import { Icon } from './Icon';

/** "Add to Calendar": downloads an .ics file that opens in Apple Calendar (double-click / tap). */
export function AddToCalendar({ events, filename, label = 'Add to Calendar', small = true }: { events: IcsEvent[]; filename?: string; label?: string; small?: boolean }) {
  return (
    <button className={`btn${small ? ' btn-sm' : ''}`} onClick={() => downloadIcs(events, filename)}>
      <Icon name="calendar" size={small ? 14 : 16} /> {label}
    </button>
  );
}
