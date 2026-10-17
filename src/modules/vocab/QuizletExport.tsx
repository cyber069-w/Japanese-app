/** Export words as Quizlet text (term ⇥ definition, one per line) – copy or download. */
import { useMemo, useState } from 'react';
import type { StudyContext } from '../../core/types';
import { Icon } from '../../components/Icon';
import { lessonLabel, vocabItems } from './items';

export function QuizletExport({ ctx }: { ctx: StudyContext }) {
  const items = vocabItems(ctx);
  const lessons = useMemo(() => [...new Set(items.map((i) => i.lesson ?? 0))].sort((a, b) => a - b), [items]);
  const [picked, setPicked] = useState<number[]>([]);
  const [msg, setMsg] = useState('');
  const lang = ctx.settings.meaningLang;

  const text = items
    .filter((i) => picked.includes(i.lesson ?? 0))
    .map((i) => `${i.kana}\t${i[lang].replace(/[\t\n]+/g, ' ')}`)
    .join('\n');
  const toggle = (l: number) => setPicked((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Copied. In Quizlet: Create set → Import → paste.');
    } catch {
      setMsg('Copy failed – select the text and copy it by hand.');
    }
  };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = `quizlet-${picked.slice().sort((x, y) => x - y).join('-')}.txt`;
    a.click();
  };

  if (!items.length) return <div className="empty">No words yet – unlock the course pack in Settings or import a list.</div>;

  return (
    <div className="stack">
      <section className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <p className="muted small">
          Pick lessons; every word becomes one line “kana ⇥ {lang === 'de' ? 'German' : 'English'} meaning”, the format Quizlet’s import expects (tab between term and definition).
        </p>
        <div className="picker-chips">
          {lessons.map((l) => (
            <button key={l} className={`chip${picked.includes(l) ? ' on' : ''}`} aria-pressed={picked.includes(l)} onClick={() => toggle(l)}>
              {lessonLabel(l)}
            </button>
          ))}
        </div>
        <textarea className="input" readOnly value={text} placeholder="Choose at least one lesson…" aria-label="Quizlet text" spellCheck={false} />
        <div className="row">
          <button className="btn btn-primary" onClick={copy} disabled={!text}>
            <Icon name="copy" size={16} /> Copy
          </button>
          <button className="btn" onClick={download} disabled={!text}>
            <Icon name="download" size={16} /> Download .txt
          </button>
          <span className="faint small">{text ? text.split('\n').length : 0} words</span>
        </div>
        {msg && <div className="notice good small">{msg}</div>}
      </section>
    </div>
  );
}
