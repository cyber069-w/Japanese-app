import { Fragment, useMemo, useState } from 'react';
import type { StudyContext } from '../../core/types';
import { updateSettings } from '../../core/store';
import { Ruby } from '../../components/Ruby';
import { Icon } from '../../components/Icon';
import { speak } from '../../lib/speech';
import { phraseRomaji, toRomaji } from '../../lib/romaji';
import { Syllables } from '../../components/Syllables';
import { TutorButton } from '../../components/TutorButton';
import { lessonLabel, vocabItems, type VocabItem } from './items';

/** Source-file order: lists in the order they were added, words by their position in the file. */
export function inFileOrder(items: VocabItem[]): VocabItem[] {
  const firstSeen = new Map<string, number>();
  items.forEach((it, i) => firstSeen.has(it.entry.source) || firstSeen.set(it.entry.source, i));
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => firstSeen.get(a.it.entry.source)! - firstSeen.get(b.it.entry.source)! || (a.it.entry.pos ?? a.i) - (b.it.entry.pos ?? b.i) || a.i - b.i)
    .map((x) => x.it);
}

const listName = (source: string) => (source === 'mnn' ? 'Course pack' : source);

export function WordList({ ctx }: { ctx: StudyContext }) {
  const items = useMemo(() => inFileOrder(vocabItems(ctx)), [ctx]);
  const lessons = useMemo(() => [...new Set(items.map((i) => i.lesson ?? 0))].sort((a, b) => a - b), [items]);
  const sources = useMemo(() => [...new Set(items.map((i) => i.entry.source))], [items]);
  const [lesson, setLesson] = useState<number | 'all'>('all');
  const [source, setSource] = useState<string>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const lang = ctx.settings.meaningLang;
  const kana = ctx.settings.kanaLayer;
  const shown = items.filter((i) => {
    if (lesson !== 'all' && i.lesson !== lesson) return false;
    if (source !== 'all' && i.entry.source !== source) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return [i.kana, i.kanji ?? '', i.de, i.en, toRomaji(i.kana), phraseRomaji(i.kana)].some((f) => f.toLowerCase().includes(s));
  });

  if (!items.length) return <div className="empty">No words yet – unlock the course pack in Settings or import a list.</div>;

  return (
    <div className="stack">
      <div className="row">
        {sources.length > 1 && (
          <select className="input" value={source} onChange={(e) => setSource(e.target.value)} aria-label="List">
            <option value="all">All lists</option>
            {sources.map((s) => (
              <option key={s} value={s}>{listName(s)}</option>
            ))}
          </select>
        )}
        <select className="input" value={String(lesson)} onChange={(e) => setLesson(e.target.value === 'all' ? 'all' : Number(e.target.value))} aria-label="Lesson">
          <option value="all">All lessons</option>
          {lessons.map((l) => (
            <option key={l} value={l}>{lessonLabel(l)}</option>
          ))}
        </select>
        <input className="input" style={{ flex: '1 1 180px' }} placeholder="Search romaji or meaning…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <button className={`chip${kana ? ' on' : ''}`} aria-pressed={kana} onClick={() => updateSettings({ kanaLayer: !kana })}>
          {kana ? 'Hide kana' : 'Show kana'}
        </button>
        <span className="faint small">{shown.length} words</span>
      </div>
      <div className="card table-wrap">
        <table className="table wordlist">
          <thead>
            <tr>
              <th className="wl-play" />
              <th>Romaji</th>
              <th>{lang === 'de' ? 'Deutsch' : 'English'}</th>
              {lesson === 'all' && <th className="wordlist-lesson">Lesson</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((i) => (
              <Fragment key={i.id}>
              <tr className="wl-row" onClick={(e) => (e.target as HTMLElement).closest('button') || setOpen(open === i.id ? null : i.id)} aria-expanded={open === i.id}>
                <td className="wl-play">
                  <div className="row" style={{ gap: 2, flexWrap: 'nowrap' }}>
                    <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => speak(i.kana, ctx.settings.voiceRate)} aria-label={`Play ${phraseRomaji(i.kana)}`}>
                      <Icon name="speaker" size={16} />
                    </button>
                    <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => speak(i.kana, Math.max(0.4, ctx.settings.voiceRate * 0.55))} aria-label={`Play ${phraseRomaji(i.kana)} slowly`} title="Slow">
                      <Icon name="clock" size={14} />
                    </button>
                  </div>
                </td>
                <td>
                  <b style={{ fontWeight: 500 }}>{phraseRomaji(i.kana)}</b>
                  {i.alt && <span className="faint small"> ({phraseRomaji(i.alt)})</span>}
                  {kana && (
                    <div className="ja small" style={{ marginTop: 2 }}>
                      {i.kanji ? <Ruby text={i.ruby} /> : <Syllables text={i.kana} />}
                    </div>
                  )}
                </td>
                <td>
                  {i[lang]}
                  <div className="faint tiny">{lang === 'de' ? i.en : i.de}</div>
                </td>
                {lesson === 'all' && <td className="faint wordlist-lesson">{lessonLabel(i.lesson ?? 0)}</td>}
              </tr>
              {open === i.id && (
                <tr className="wl-detail">
                  <td colSpan={lesson === 'all' ? 4 : 3}>
                    <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
                      <div className="row small" style={{ gap: 16 }}>
                        <span><span className="faint">Romaji</span> {phraseRomaji(i.kana)}</span>
                        {kana && <span lang="ja"><span className="faint">Kana</span> {i.kana}{i.kanji ? ` · ${i.kanji}` : ''}</span>}
                        <span><span className="faint">Deutsch</span> {i.de}</span>
                        <span><span className="faint">English</span> {i.en}</span>
                        <span><span className="faint">List</span> {listName(i.entry.source)} · {lessonLabel(i.lesson ?? 0)}</span>
                      </div>
                      <div className="row">
                        <TutorButton
                          small
                          label="Ask tutor: memory aid and examples"
                          request={() => ({
                            courseId: 'japanese',
                            courseName: 'Japanisch',
                            topic: `Vokabel ${phraseRomaji(i.kana)} = ${i.de}`,
                            context: `Wort: ${phraseRomaji(i.kana)} (${i.kana}${i.kanji ? `, ${i.kanji}` : ''})\nBedeutung: ${i.de} / ${i.en}\nLektion: ${lessonLabel(i.lesson ?? 0)}`,
                            task: 'Gib mir eine Merkhilfe (Eselsbrücke auf Deutsch) und 3 einfache Beispielsätze auf A1-Niveau (Romaji + Deutsch), möglichst nur mit Wörtern bis zu dieser Lektion.',
                          })}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
