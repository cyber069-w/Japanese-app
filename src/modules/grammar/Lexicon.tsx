/**
 * Grammar lexicon: every grammar point as a reference entry – search, categories, A–Z.
 * Text is German with romaji (data/lexicon.json, rewritten from the notes without changing them);
 * kana/kanji only with “Show kana”.
 */
import { useMemo, useState } from 'react';
import type { StudyContext } from '../../core/types';
import { updateSettings } from '../../core/store';
import { Ruby } from '../../components/Ruby';
import { Icon } from '../../components/Icon';
import { TutorButton } from '../../components/TutorButton';
import { slowRate, speak } from '../../lib/speech';
import { POINTS, type GrammarPoint } from './points';
import { parseSentence, sentenceRomaji } from './sentence';
import LEXICON from './data/lexicon.json';

export type LexCategory = 'particles' | 'verbs' | 'adjectives' | 'patterns' | 'pointing' | 'other';
export interface LexText { cat: LexCategory; name: string; formation: string; rule: string; mistakes?: string[] }

export const CATEGORIES: Array<[LexCategory, string]> = [
  ['particles', 'Partikeln'],
  ['verbs', 'Verbformen'],
  ['adjectives', 'Adjektive'],
  ['patterns', 'Satzmuster'],
  ['pointing', 'Frage- und Zeigewörter'],
  ['other', 'Weitere'],
];

export interface LexEntry { point: GrammarPoint; text: LexText; examples: Array<{ romaji: string; de: string; en: string; ruby: ReturnType<typeof parseSentence>['ruby']; spoken: string }> }

export const LEX: LexEntry[] = POINTS.map((point) => ({
  point,
  text: (LEXICON as Record<string, LexText>)[point.id],
  examples: point.examples.map((ex) => {
    const s = parseSentence(ex.ja);
    return { romaji: sentenceRomaji(s), de: ex.de, en: ex.en, ruby: s.ruby, spoken: s.spoken };
  }),
}));

const PARTICLE_WORDS = new Set(['wa', 'ga', 'o', 'ni', 'de', 'e', 'to', 'mo', 'no', 'ka', 'kara', 'made', 'ya', 'ne', 'yo']);
const words = (e: LexEntry) => new Set(e.text.formation.toLowerCase().split(/[^a-z]+/).filter((w) => PARTICLE_WORDS.has(w)));

/** Related: shares a particle with this entry's formation, or same category in a neighbouring lesson. */
export function relatedTo(e: LexEntry, max = 5): LexEntry[] {
  const mine = words(e);
  return LEX.filter((o) => o !== e)
    .map((o) => {
      const shared = [...words(o)].filter((w) => mine.has(w)).length;
      const near = o.text.cat === e.text.cat && Math.abs(o.point.lesson - e.point.lesson) <= 1 ? 1 : 0;
      return { o, score: shared * 2 + near };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.o.point.lesson - b.o.point.lesson)
    .slice(0, max)
    .map((x) => x.o);
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function Lexicon({ ctx }: { ctx: StudyContext }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<LexCategory | 'all' | 'az'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const kana = ctx.settings.kanaLayer;
  const lang = ctx.settings.meaningLang;

  const shown = useMemo(() => {
    const s = norm(q.trim());
    let list = LEX.filter((e) => cat === 'all' || cat === 'az' || e.text.cat === cat);
    if (s) list = list.filter((e) => norm([e.text.name, e.text.formation, e.text.rule, ...e.examples.flatMap((x) => [x.romaji, x.de])].join(' ')).includes(s));
    if (cat === 'az') list = [...list].sort((a, b) => a.text.name.localeCompare(b.text.name, 'de'));
    return list;
  }, [q, cat]);

  const jump = (id: string) => {
    setOpen(id);
    setCat('all');
    setQ('');
    requestAnimationFrame(() => document.getElementById(`lex-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  let lastLetter = '';
  return (
    <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
      <div className="row">
        <input className="input" style={{ flex: '1 1 220px' }} placeholder="Search: “wa”, „Verneinung“, „weil“ …" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the lexicon" />
        <button className={`chip${kana ? ' on' : ''}`} aria-pressed={kana} onClick={() => updateSettings({ kanaLayer: !kana })}>{kana ? 'Hide kana' : 'Show kana'}</button>
        <TutorButton small label="Ask tutor about grammar" request={() => ({ courseId: 'japanese', courseName: 'Japanisch', topic: 'Japanische Grammatik (Minna no Nihongo, Lektionen 1–10)', context: q ? `Ich suche gerade nach: ${q}` : 'Allgemeine Frage zur Grammatik.', task: 'Hilf mir bei meiner Frage, die ich gleich stelle. Erkläre mit kurzen Beispielen in Romaji und Deutsch.' })} />
      </div>
      <div className="picker-chips" role="group" aria-label="Category">
        {[['all', 'Alle'] as const, ...CATEGORIES, ['az', 'A–Z'] as const].map(([id, label]) => (
          <button key={id} className={`chip${cat === id ? ' on' : ''}`} aria-pressed={cat === id} onClick={() => setCat(id)}>
            {label}
            {id !== 'all' && id !== 'az' && <span className="chip-sub">{LEX.filter((e) => e.text.cat === id).length}</span>}
          </button>
        ))}
      </div>
      {shown.length === 0 && <div className="empty">Nothing found for “{q}”.</div>}
      {shown.map((e) => {
        const letter = cat === 'az' ? e.text.name[0].toUpperCase() : '';
        const header = letter && letter !== lastLetter ? letter : '';
        if (header) lastLetter = letter;
        const isOpen = open === e.point.id || !!q;
        return (
          <div key={e.point.id}>
            {header && <div className="eyebrow" style={{ margin: '6px 0 8px' }}>{header}</div>}
            <article id={`lex-${e.point.id}`} className="card lex-entry">
              <button className="lex-head" onClick={() => setOpen(isOpen && !q ? null : e.point.id)} aria-expanded={isOpen}>
                <span className="grow">
                  <b className="lex-name">{e.text.name}</b>
                  <code className="lex-formation">{e.text.formation}</code>
                </span>
                <span className="faint tiny nowrap">Lesson {e.point.lesson}</span>
                <Icon name="chevron" size={16} className={isOpen ? 'chev-open' : ''} />
              </button>
              {isOpen && (
                <div className="lex-body stack" style={{ '--gap': '14px' } as React.CSSProperties}>
                  <section>
                    <div className="eyebrow">Kurzregel</div>
                    <p>{e.text.rule}</p>
                  </section>
                  <section>
                    <div className="eyebrow">Bildung</div>
                    <p><code className="lex-formation">{e.text.formation}</code>{kana && <span className="faint small" lang="ja"> · {e.point.pattern}</span>}</p>
                  </section>
                  <section>
                    <div className="eyebrow">Beispiele</div>
                    <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
                      {e.examples.map((x) => (
                        <div key={x.romaji} className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 6 }}>
                          <button className="icon-btn" style={{ width: 32, height: 32, flex: 'none' }} onClick={() => speak(x.spoken, ctx.settings.voiceRate)} aria-label="Play sentence">
                            <Icon name="speaker" size={16} />
                          </button>
                          <button className="icon-btn" style={{ width: 32, height: 32, flex: 'none' }} onClick={() => speak(x.spoken, slowRate(ctx.settings.voiceRate))} aria-label="Play sentence slowly" title="Slow">
                            <Icon name="clock" size={14} />
                          </button>
                          <div>
                            <div style={{ fontWeight: 500 }}>{x.romaji}</div>
                            {kana && <Ruby text={x.ruby} className="grammar-example" />}
                            <div className="faint small">{lang === 'de' ? x.de : x.en}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  {e.text.mistakes && e.text.mistakes.length > 0 && (
                    <section>
                      <div className="eyebrow">Typische Fehler</div>
                      <ul>{e.text.mistakes.map((m) => <li key={m}>{m}</li>)}</ul>
                    </section>
                  )}
                  {relatedTo(e).length > 0 && (
                    <section>
                      <div className="eyebrow">Verwandte Einträge</div>
                      <div className="picker-chips">
                        {relatedTo(e).map((r) => (
                          <button key={r.point.id} className="chip" onClick={() => jump(r.point.id)}>{r.text.name}</button>
                        ))}
                      </div>
                    </section>
                  )}
                  <div>
                    <TutorButton
                      small
                      request={() => ({
                        courseId: 'japanese',
                        courseName: 'Japanisch',
                        topic: `Grammatik – ${e.text.name} (${e.text.formation}), Minna no Nihongo Lektion ${e.point.lesson}`,
                        context: [`Regel: ${e.text.rule}`, 'Beispiele:', ...e.examples.map((x) => `- ${x.romaji} = ${x.de}`)].join('\n'),
                        task: 'Erkläre mir diese Regel noch einmal einfach, nenne typische Fehler von Anfängern und gib mir 3 neue Beispielsätze (Romaji + Deutsch) zum Üben.',
                      })}
                    />
                  </div>
                </div>
              )}
            </article>
          </div>
        );
      })}
    </div>
  );
}
