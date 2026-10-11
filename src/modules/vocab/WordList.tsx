import { useMemo, useState } from 'react';
import type { StudyContext } from '../../core/types';
import { Ruby } from '../../components/Ruby';
import { Icon } from '../../components/Icon';
import { speak } from '../../lib/speech';
import { phraseRomaji, toRomaji } from '../../lib/romaji';
import { lessonLabel, vocabItems } from './items';

export function WordList({ ctx }: { ctx: StudyContext }) {
  const items = vocabItems(ctx);
  const lessons = useMemo(() => [...new Set(items.map((i) => i.lesson ?? 0))].sort((a, b) => a - b), [items]);
  const [lesson, setLesson] = useState<number | 'all'>(lessons[1] ?? lessons[0] ?? 'all');
  const [q, setQ] = useState('');
  const lang = ctx.settings.meaningLang;
  const shown = items.filter((i) => {
    if (lesson !== 'all' && i.lesson !== lesson) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return [i.kana, i.kanji ?? '', i.de, i.en, toRomaji(i.kana)].some((f) => f.toLowerCase().includes(s));
  });

  if (!items.length) return <div className="empty">No words yet – unlock the course pack in Settings or import a list.</div>;

  return (
    <div className="stack">
      <div className="row">
        <select className="input" value={String(lesson)} onChange={(e) => setLesson(e.target.value === 'all' ? 'all' : Number(e.target.value))} aria-label="Lesson">
          <option value="all">All lessons</option>
          {lessons.map((l) => (
            <option key={l} value={l}>
              {lessonLabel(l)}
            </option>
          ))}
        </select>
        <input className="input" style={{ flex: '1 1 200px' }} placeholder="Search kana, romaji or meaning…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="faint small">{shown.length} words</span>
      </div>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 44 }} />
              <th>Japanese</th>
              <th>{lang === 'de' ? 'Deutsch' : 'English'}</th>
              <th>Lesson</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((i) => (
              <tr key={i.id}>
                <td>
                  <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => speak(i.kana, ctx.settings.voiceRate)} aria-label={`Play ${i.kana}`}>
                    <Icon name="speaker" size={17} />
                  </button>
                </td>
                <td className="ja">
                  <Ruby text={i.ruby} />
                  {i.alt && <span className="faint small"> ({i.alt})</span>}
                  <div className="faint tiny">{phraseRomaji(i.kana)}</div>
                </td>
                <td>
                  {i[lang]}
                  <div className="faint tiny">{lang === 'de' ? i.en : i.de}</div>
                </td>
                <td className="faint">{lessonLabel(i.lesson ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
