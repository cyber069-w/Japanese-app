import { useState } from 'react';
import type { StudyContext } from '../../core/types';
import { Ruby } from '../../components/Ruby';
import { Icon } from '../../components/Icon';
import { speak } from '../../lib/speech';
import { POINTS } from './points';
import { parseSentence } from './sentence';

export function GrammarNotes({ ctx }: { ctx: StudyContext }) {
  const lessons = [...new Set(POINTS.map((p) => p.lesson))];
  const [lesson, setLesson] = useState(lessons[0]);
  const lang = ctx.settings.meaningLang;
  return (
    <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
      <div className="seg" style={{ flexWrap: 'wrap', alignSelf: 'flex-start' }}>
        {lessons.map((l) => (
          <button key={l} className={l === lesson ? 'on' : ''} onClick={() => setLesson(l)}>
            第{l}課
          </button>
        ))}
      </div>
      {POINTS.filter((p) => p.lesson === lesson).map((p) => (
        <section key={p.id} className="card card-pad stack" style={{ '--gap': '10px' } as React.CSSProperties}>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <h2 className="serif" lang="ja" style={{ fontWeight: 600 }}>{p.pattern}</h2>
            <span className="tag tag-accent">{p.title[lang]}</span>
          </div>
          <p className="muted">{p.explain[lang]}</p>
          <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
            {p.examples.map((ex) => {
              const s = parseSentence(ex.ja);
              return (
                <div key={ex.ja} className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                  <button className="icon-btn" style={{ width: 34, height: 34, flex: 'none' }} onClick={() => speak(s.reading, ctx.settings.voiceRate)} aria-label="Play sentence">
                    <Icon name="speaker" size={17} />
                  </button>
                  <div>
                    <Ruby text={s.ruby} className="serif grammar-example" />
                    <div className="faint small">{ex[lang]}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
