/** Status rows for Settings → Connections: working / stale / not set up / failed, each with a short fix. */
import type { InboxSource } from './canvas';

export type ConnState = 'working' | 'stale' | 'off' | 'failed';
export interface Conn { name: string; state: ConnState; detail: string; fix?: string }

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ago = (ms: number) => (ms < 2 * HOUR ? `${Math.max(1, Math.round(ms / 60_000))} min ago` : ms < 2 * DAY ? `${Math.round(ms / HOUR)} h ago` : `${Math.round(ms / DAY)} days ago`);

export function canvasConn(inboxAt: string | undefined, source: InboxSource, reportAt: string | undefined, error: string | undefined, now: number): Conn {
  if (!inboxAt) {
    return error
      ? { name: 'Canvas', state: 'failed', detail: error, fix: 'Check the device-sync connection below, then reload.' }
      : { name: 'Canvas', state: 'off', detail: 'No inbox found.', fix: 'Run python3 scripts/canvas/canvas_sync.py --inbox on the Mac (and turn on device sync to see it on the phone).' };
  }
  const age = now - new Date(inboxAt).getTime();
  const last = reportAt ? ` · last download run ${ago(now - new Date(reportAt).getTime())}` : '';
  const via = source === 'sync' ? ' (via device sync)' : '';
  return age > 36 * HOUR
    ? { name: 'Canvas', state: 'stale', detail: `Inbox from ${ago(age)}${via}${last}`, fix: "The daily 7:00 job didn't run – is the Mac on? Run python3 scripts/canvas/canvas_sync.py --download." }
    : { name: 'Canvas', state: 'working', detail: `Inbox from ${ago(age)}${via}${last}` };
}

export function timetableConn(importedAt: number | undefined, count: number, now: number): Conn {
  if (!importedAt) return { name: 'Outlook timetable', state: 'off', detail: 'No timetable imported.', fix: 'Focus → Lectures → import your Outlook .ics file.' };
  const age = now - importedAt;
  return age > 14 * DAY
    ? { name: 'Outlook timetable', state: 'stale', detail: `${count} events, imported ${ago(age)}`, fix: 'Export the calendar from Outlook again and import it on the Lectures page.' }
    : { name: 'Outlook timetable', state: 'working', detail: `${count} events, imported ${ago(age)}` };
}

export function syncConn(phase: 'off' | 'idle' | 'syncing' | 'error', lastSync: number | undefined, error: string | undefined, repo: string | undefined, now: number): Conn {
  if (phase === 'off') return { name: 'Device sync', state: 'off', detail: 'Not connected.', fix: 'Connect a private GitHub repository in the Sync section below.' };
  if (phase === 'error') return { name: 'Device sync', state: 'failed', detail: error ?? 'Sync failed.', fix: 'Check the connection and token, or disconnect and connect again.' };
  const age = lastSync ? now - lastSync : Infinity;
  return age > 3 * DAY
    ? { name: 'Device sync', state: 'stale', detail: `${repo} · last sync ${lastSync ? ago(age) : 'never'}`, fix: 'Open the app and keep it open for a minute.' }
    : { name: 'Device sync', state: 'working', detail: `${repo} · last sync ${ago(age)}` };
}

export function azureConn(present: boolean, source: 'device' | 'file' | null): Conn {
  return present
    ? { name: 'Azure Speech', state: 'working', detail: `Key present (${source === 'file' ? 'private/azure-speech.json' : 'this device'})` }
    : { name: 'Azure Speech', state: 'off', detail: 'No key.', fix: 'Save { "azureSpeechKey", "azureSpeechRegion" } in private/azure-speech.json, or enter them below.' };
}
