/** Replace the default N5 list with the kanji from your own course. */
import { useState } from 'react';
import type { StudyContext } from '../../core/types';
import { setKanjiList } from '../../core/store';
import { DEFAULT_LIST, KANJI_BY_CHAR } from './data';

export function MyKanjiList({ ctx }: { ctx: StudyContext }) {
  const current = ctx.content.kanjiList;
  const [text, setText] = useState(current.join(''));
  const chars = [...new Set([...text].filter((c) => /\p{Script=Han}/u.test(c)))];
  const known = chars.filter((c) => KANJI_BY_CHAR.has(c));
  const unknown = chars.filter((c) => !KANJI_BY_CHAR.has(c));
  const [saved, setSaved] = useState(false);

  return (
    <div className="stack">
      <section className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <p className="muted">
          Paste the kanji you need for your exam – any text works, only the kanji are picked out. Leave it empty to use the
          default JLPT N5 list ({DEFAULT_LIST.length} kanji).
        </p>
        <textarea className="input" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', minHeight: 120 }} lang="ja" value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }} placeholder="日一国人年大十二本中…" aria-label="Kanji list" />
        <div className="row small">
          <span className="tag tag-good">{known.length} kanji ready</span>
          {unknown.length > 0 && <span className="tag tag-warn">no data yet for: {unknown.join(' ')}</span>}
        </div>
        <div className="row">
          <button className="btn btn-primary" onClick={async () => { await setKanjiList(known); setSaved(true); }}>
            Use this list
          </button>
          <button className="btn btn-ghost" onClick={async () => { setText(''); await setKanjiList([]); setSaved(true); }}>
            Back to N5 default
          </button>
          {current.length === 0 && <span className="faint small">Currently: default N5 list</span>}
        </div>
        {saved && <div className="notice good">Saved – your Kanji exercises now use {known.length || DEFAULT_LIST.length} kanji.</div>}
      </section>
    </div>
  );
}
