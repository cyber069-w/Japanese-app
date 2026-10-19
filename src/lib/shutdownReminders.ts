import type { IcsEvent } from './ics';

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** One weekly repeating 15-minute event per weekday, starting at the next such weekday at its time. */
export function shutdownReminders(times: Record<string, string>, now: number, url: string): IcsEvent[] {
  return Object.keys(times).sort().map((wd) => {
    const [h, m] = (times[wd] || '22:30').split(':').map(Number);
    const base = new Date(now);
    const diff = (Number(wd) - base.getDay() + 7) % 7;
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() + diff, h, m).getTime();
    return {
      title: 'Shutdown', start: start < now ? start + 7 * 86_400_000 : start, end: (start < now ? start + 7 * 86_400_000 : start) + 15 * 60_000,
      rrule: `FREQ=WEEKLY;BYDAY=${BYDAY[Number(wd)]}`, alarmMin: 0, url, description: 'Close the day: numbers, tomorrow, top 3.', uid: `shutdown-${BYDAY[Number(wd)]}@studydesk`,
    };
  });
}
