/** Export / import of all progress as a JSON file (for backups and moving devices). */
import { getState, applyImport } from './store';
import { storage, type DayLog } from './db';
import type { CardState } from './srs';
import type { Profile, Settings, VocabEntry } from './types';
import { dayKey } from '../lib/date';

interface BackupFile {
  app: 'nihongo-app';
  version: 1;
  exportedAt: string;
  settings: Settings;
  cards: CardState[];
  days: DayLog[];
  userVocab: VocabEntry[];
  kanjiList: string[];
  profile?: Profile | null;
}

export async function exportBackup() {
  const s = getState();
  const data: BackupFile = {
    app: 'nihongo-app',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: s.settings,
    cards: Object.values(s.cards),
    days: Object.values(s.days),
    userVocab: s.userVocab,
    kanjiList: (await storage.get<string[]>('kanjiList')) ?? [],
    profile: s.content.profile,
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `nihongo-progress-${dayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/**
 * Merge a backup into the current progress: for every card the more recently
 * reviewed version wins, for every day the one with more reviews.
 */
export async function importBackup(file: File): Promise<{ cards: number; days: number }> {
  const data = JSON.parse(await file.text()) as Partial<BackupFile>;
  if (data.app !== 'nihongo-app' || !Array.isArray(data.cards) || !Array.isArray(data.days)) {
    throw new Error('This is not a Nihongo progress file.');
  }
  const s = getState();
  const cards = data.cards.filter((c) => c && typeof c.id === 'string' && (!s.cards[c.id] || c.last > s.cards[c.id].last));
  const days = data.days.filter((d) => d && typeof d.date === 'string' && (!s.days[d.date] || d.reviews > s.days[d.date].reviews));
  const vocab = new Map(s.userVocab.map((v) => [v.id, v]));
  for (const v of data.userVocab ?? []) vocab.set(v.id, v);
  await applyImport({
    cards,
    days,
    settings: data.settings,
    userVocab: [...vocab.values()],
    kanjiList: data.kanjiList && data.kanjiList.length ? data.kanjiList : undefined,
    // keep the self-introduction on this device if it already has one
    profile: data.profile && !s.content.profile ? data.profile : undefined,
  });
  return { cards: cards.length, days: days.length };
}
