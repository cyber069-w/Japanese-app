/** Every oral-exam question with its model answers – a study sheet to read and listen to. */
import { useState } from 'react';
import type { StudyContext } from '../../core/types';
import { ModelBack, SpokenLine } from './ModelAnswer';
import { isComplete } from './intro';
import { QUESTIONS, TOPICS, type Topic } from './questions';

export function QuestionList({ ctx }: { ctx: StudyContext }) {
  const [topic, setTopic] = useState<Topic>('me');
  const lang = ctx.settings.meaningLang;
  return (
    <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
      <div className="seg seg-wrap" role="tablist" aria-label="Topic">
        {(Object.keys(TOPICS) as Topic[]).map((t) => (
          <button key={t} role="tab" aria-selected={t === topic} className={t === topic ? 'on' : ''} onClick={() => setTopic(t)}>
            <span lang="ja">{TOPICS[t].label}</span> <span className="faint">· {TOPICS[t].sub}</span>
          </button>
        ))}
      </div>
      {!isComplete(ctx.content.profile) && (
        <div className="notice small">
          Answers about you use an example person. <a href="#/m/speaking/t/intro">Write your self-introduction</a> and they
          become yours.
        </div>
      )}
      {QUESTIONS.filter((q) => q.topic === topic).map((q) => (
        <section key={q.id} className="card card-pad qa-card">
          <div className="qa-q">
            <SpokenLine ja={q.q} meaning={q[lang]} ctx={ctx} size="lg" />
            <span className="tag">L{q.lesson}</span>
          </div>
          <ModelBack q={q} ctx={ctx} exampleNote={false} />
        </section>
      ))}
    </div>
  );
}
