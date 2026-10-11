/**
 * Self-introduction builder (じこしょうかい): fill in a short form and get a correct
 * Japanese introduction with furigana, translation, audio and a practice mode.
 * The form is saved on this device and feeds the oral exam questions.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Profile, StudyContext } from '../../core/types';
import { setProfile } from '../../core/store';
import { Ruby } from '../../components/Ruby';
import { Icon } from '../../components/Icon';
import { Recorder } from '../../components/Recorder';
import { nameToKatakana } from '../../lib/katakanaName';
import { toKana } from '../../lib/romaji';
import { slowRate, speakQueue, stopSpeaking, useSpeaking } from '../../lib/speech';
import { readAge, readDate } from '../numbers/readings';
import { parseSentence } from '../grammar/sentence';
import { COUNTRIES, HOBBIES, MAJORS, YEARS } from './data';
import { EMPTY_PROFILE, introLines, isBlank } from './intro';

type JaField = 'nameJa' | 'universityJa' | 'countryOtherJa';
const MAX_HOBBIES = 3;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

/** Text input that turns romaji into katakana as you type (spaces become ・). */
function KatakanaInput({ id, value, onChange, placeholder, suffix, edited, onReset }: {
  id?: string; value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string; edited: boolean; onReset: () => void;
}) {
  const conv = (v: string, final: boolean) => toKana(v.replace(/ /g, '・'), { katakana: true, final });
  return (
    <div className="kana-row">
      <span className="kana-tag" lang="ja">カナ</span>
      <input
        id={id}
        className="input kana-input"
        lang="ja"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(conv(e.target.value, false))}
        onBlur={(e) => onChange(conv(e.target.value, true))}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
      />
      {suffix && <span className="kana-suffix serif" lang="ja">{suffix}</span>}
      {edited && (
        <button type="button" className="icon-btn" onClick={onReset} title="Back to the suggestion" aria-label="Back to the suggestion">
          <Icon name="undo" size={17} />
        </button>
      )}
    </div>
  );
}

export function SelfIntroTool({ ctx }: { ctx: StudyContext }) {
  const lang = ctx.settings.meaningLang;
  const [p, setP] = useState<Profile>(() => ({ ...EMPTY_PROFILE, ...(ctx.content.profile ?? {}) }));
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle');
  const firstRun = useRef(true);

  // save shortly after the last change
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaved('saving');
    const t = setTimeout(() => {
      void setProfile(isBlank(p) ? null : p).then(() => setSaved('saved'));
    }, 400);
    return () => clearTimeout(t);
  }, [p]);

  const set = (patch: Partial<Profile>) => setP((prev) => ({ ...prev, ...patch }));
  const isEdited = (f: JaField) => p.edited.includes(f);
  const jaOf = (f: JaField, romaji: string) => (isEdited(f) ? p[f] : nameToKatakana(romaji));
  const setJa = (f: JaField, v: string) => set({ [f]: v, edited: [...new Set([...p.edited, f])] } as Partial<Profile>);
  const resetJa = (f: JaField) => set({ [f]: '', edited: p.edited.filter((x) => x !== f) } as Partial<Profile>);

  const countries = useMemo(() => {
    const name = (c: (typeof COUNTRIES)[number]) => c[lang];
    return {
      common: COUNTRIES.filter((c) => c.common),
      rest: COUNTRIES.filter((c) => !c.common).sort((a, b) => name(a).localeCompare(name(b), lang)),
    };
  }, [lang]);
  const majors = useMemo(() => [...MAJORS].sort((a, b) => a[lang].localeCompare(b[lang], lang)), [lang]);

  const [bm, bd] = p.birthday ? p.birthday.split('-').map(Number) : [0, 0];
  // keep a half-filled date ("05-00") so picking the day first doesn't reset it
  const setBirthday = (m: number, d: number) => set({ birthday: m || d ? `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '' });

  const toggleHobby = (id: string) =>
    set({ hobbies: p.hobbies.includes(id) ? p.hobbies.filter((h) => h !== id) : p.hobbies.length < MAX_HOBBIES ? [...p.hobbies, id] : p.hobbies });

  const reset = () => {
    if (!confirm('Clear the whole form?')) return;
    stopSpeaking();
    setP({ ...EMPTY_PROFILE });
  };

  return (
    <div className="intro-layout">
      <section className="card card-pad intro-form">
        <div className="row" style={{ marginBottom: 6 }}>
          <h2 style={{ flex: 1 }}>About you</h2>
          <span className="faint small" aria-live="polite">{saved === 'saving' ? 'Saving…' : saved === 'saved' ? 'Saved on this device' : ''}</span>
        </div>
        <p className="muted small" style={{ marginBottom: 18 }}>
          Your introduction builds itself as you type. Name, country, university and major are the core – everything else is
          optional.
        </p>

        <Field label="Your name" htmlFor="f-name" hint="Foreign names are written in katakana. The suggestion follows German pronunciation – change it if yours sounds different.">
          <input id="f-name" className="input" value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Anna Müller" autoComplete="name" />
          <KatakanaInput value={jaOf('nameJa', p.name)} onChange={(v) => setJa('nameJa', v)} placeholder="アンナ・ミュラー" edited={isEdited('nameJa')} onReset={() => resetJa('nameJa')} />
        </Field>

        <Field label="Country" htmlFor="f-country">
          <select id="f-country" className="input" value={p.country} onChange={(e) => set({ country: e.target.value })}>
            <option value="">Choose…</option>
            <optgroup label="Common">
              {countries.common.map((c) => (
                <option key={c.id} value={c.id}>{c[lang]} – {parseSentence(c.ja).text}</option>
              ))}
            </optgroup>
            <optgroup label="All countries">
              {countries.rest.map((c) => (
                <option key={c.id} value={c.id}>{c[lang]} – {parseSentence(c.ja).text}</option>
              ))}
            </optgroup>
            <option value="other">Other…</option>
          </select>
          {p.country === 'other' && (
            <>
              <input className="input" value={p.countryOther} onChange={(e) => set({ countryOther: e.target.value })} placeholder="Country name" />
              <KatakanaInput value={jaOf('countryOtherJa', p.countryOther)} onChange={(v) => setJa('countryOtherJa', v)} edited={isEdited('countryOtherJa')} onReset={() => resetJa('countryOtherJa')} />
            </>
          )}
        </Field>

        <Field label="University" htmlFor="f-uni" hint="The city or name, e.g. St. Gallen or Zürich – 大学 (university) is added for you.">
          <input id="f-uni" className="input" value={p.university} onChange={(e) => set({ university: e.target.value })} placeholder="e.g. St. Gallen" />
          <KatakanaInput
            value={jaOf('universityJa', p.university).replace(/大学$/, '')}
            onChange={(v) => setJa('universityJa', v)}
            suffix="大学"
            edited={isEdited('universityJa')}
            onReset={() => resetJa('universityJa')}
          />
        </Field>

        <Field label="Year of study">
          <div className="seg seg-wrap" role="radiogroup" aria-label="Year of study">
            {[{ id: '', label: '–' }, ...YEARS].map((y) => (
              <button key={y.id} type="button" role="radio" aria-checked={p.year === y.id} className={p.year === y.id ? 'on' : ''} onClick={() => set({ year: y.id })}>
                {y.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Major" htmlFor="f-major">
          <select id="f-major" className="input" value={p.major} onChange={(e) => set({ major: e.target.value })}>
            <option value="">Choose…</option>
            {majors.map((m) => (
              <option key={m.id} value={m.id}>{m[lang]} – {parseSentence(m.ja).text}</option>
            ))}
            <option value="other">Other…</option>
          </select>
          {p.major === 'other' && (
            <div className="field-pair">
              <input className="input" lang="ja" value={p.majorOtherJa} onChange={(e) => set({ majorOtherJa: e.target.value })} placeholder="Japanese, e.g. 地理学" />
              <input className="input" value={p.majorOtherDe} onChange={(e) => set({ majorOtherDe: e.target.value })} placeholder={lang === 'de' ? 'Deutsch, z. B. Geografie' : 'English, e.g. Geography'} />
            </div>
          )}
        </Field>

        <div className="field-pair">
          <Field label="Age" htmlFor="f-age" hint={p.age ? <span lang="ja">{p.age}歳 = {readAgeSafe(p.age)}</span> : 'optional'}>
            <input
              id="f-age"
              className="input"
              type="number"
              inputMode="numeric"
              min={10}
              max={99}
              value={p.age ?? ''}
              onChange={(e) => set({ age: e.target.value ? Math.max(1, Math.min(99, Number(e.target.value))) : null })}
              placeholder="–"
            />
          </Field>
          <Field label="Birthday" hint={bm && bd ? <span lang="ja">{bm}月{bd}日 = {readDate(bm, bd).kana}</span> : 'optional – for the Q&A'}>
            <div className="row" style={{ flexWrap: 'nowrap', gap: 8 }}>
              <select className="input" value={bm || ''} onChange={(e) => setBirthday(Number(e.target.value), bd)} aria-label="Birthday month">
                <option value="">Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select className="input" value={bd || ''} onChange={(e) => setBirthday(bm, Number(e.target.value))} aria-label="Birthday day">
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
          </Field>
        </div>

        <Field label={`Hobbies · up to ${MAX_HOBBIES}`}>
          <div className="picker-chips">
            {HOBBIES.map((h) => {
              const on = p.hobbies.includes(h.id);
              return (
                <button
                  key={h.id}
                  type="button"
                  className={`chip${on ? ' on' : ''}`}
                  aria-pressed={on}
                  disabled={!on && p.hobbies.length >= MAX_HOBBIES}
                  onClick={() => toggleHobby(h.id)}
                >
                  <span lang="ja">{parseSentence(h.ja).text}</span>
                  <span className="chip-sub">{h[lang]}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <div className="row" style={{ marginTop: 6 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
            <Icon name="trash" size={15} /> Clear form
          </button>
        </div>
      </section>

      <IntroPreview profile={p} ctx={ctx} />
    </div>
  );
}

function readAgeSafe(n: number) {
  try {
    return readAge(n).kana;
  } catch {
    return '';
  }
}

function IntroPreview({ profile, ctx }: { profile: Profile; ctx: StudyContext }) {
  const lang = ctx.settings.meaningLang;
  const lines = useMemo(() => introLines(profile).map((l) => ({ ...l, s: parseSentence(l.ja) })), [profile]);
  const [practise, setPractise] = useState(false);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const speaking = useSpeaking();
  useEffect(() => {
    if (!speaking) setCurrent(null);
  }, [speaking]);
  useEffect(() => () => stopSpeaking(), []);

  const filled = lines.length > 2;
  const playAll = (rate: number) => {
    if (speaking) {
      stopSpeaking();
      return;
    }
    speakQueue(lines.map((l) => l.s.spoken), rate, setCurrent);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.map((l) => l.s.text).join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard not available */
    }
  };

  return (
    <section className="card intro-preview" aria-label="Your self-introduction">
      <div className="intro-head">
        <div>
          <div className="serif intro-title" lang="ja">じこしょうかい</div>
          <div className="faint small">Your self-introduction</div>
        </div>
        <span className="seal intro-seal" lang="ja" aria-hidden="true">話</span>
      </div>

      <div className="intro-toolbar">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => playAll(ctx.settings.voiceRate)} disabled={!filled}>
          <Icon name={speaking ? 'stop' : 'play'} size={15} /> {speaking ? 'Stop' : 'Play all'}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => playAll(slowRate(ctx.settings.voiceRate))} disabled={!filled || speaking}>
          <Icon name="gauge" size={15} /> Slowly
        </button>
        <button
          type="button"
          className={`btn btn-sm${practise ? ' on-accent' : ''}`}
          aria-pressed={practise}
          onClick={() => {
            setPractise(!practise);
            setShown(new Set());
          }}
          disabled={!filled}
        >
          <Icon name="eye" size={15} /> {practise ? 'Show all' : 'Practise'}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={copy} disabled={!filled}>
          <Icon name={copied ? 'check' : 'copy'} size={15} /> {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {practise && <p className="faint small intro-practise-tip">Say each line out loud from the translation, then tap it to check.</p>}

      <ol className="intro-lines">
        {lines.map((l, i) => {
          const hidden = practise && !shown.has(l.id);
          return (
            <li key={l.id} className={`intro-line${current === i ? ' current' : ''}${hidden ? ' hidden' : ''}`}>
              <button
                type="button"
                className="icon-btn say-btn"
                onClick={() => speakQueue([l.s.spoken], ctx.settings.voiceRate, (x) => setCurrent(x === null ? null : i))}
                aria-label="Play this line"
              >
                <Icon name="speaker" size={17} />
              </button>
              <div className="intro-text">
                {hidden ? (
                  <button type="button" className="intro-reveal" onClick={() => setShown(new Set([...shown, l.id]))}>
                    <Ruby text={l.s.ruby} className="serif intro-ja" />
                    <span className="intro-reveal-label">tap to show</span>
                  </button>
                ) : (
                  <Ruby text={l.s.ruby} className="serif intro-ja" />
                )}
                <div className="muted small">{l[lang]}</div>
              </div>
            </li>
          );
        })}
      </ol>
      {!filled && <div className="empty small" style={{ padding: '18px 16px' }}>Fill in the form – your introduction appears here, line by line.</div>}

      {filled && (
        <div className="intro-foot">
          <Recorder storageKey="rec:speaking:intro" label="Record yourself" />
          <a className="btn btn-ghost btn-sm" href="#/m/speaking">
            Practise the exam questions <Icon name="right" size={15} />
          </a>
        </div>
      )}
    </section>
  );
}
