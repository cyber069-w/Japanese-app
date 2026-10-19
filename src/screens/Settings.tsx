import { useEffect, useRef, useState, type ReactNode } from 'react';
import { eraseEverything, installPack, removePack, resetModule, updateSettings, useApp } from '../core/store';
import { exportBackup, importBackup } from '../core/backup';
import { packAvailable, unlockPack } from '../core/privatePack';
import type { Settings as S } from '../core/types';
import { MODULES } from '../modules';
import { COURSES } from '../courses';
import { hasJapaneseVoice, onVoicesChanged, speak, speechSupported, voiceName } from '../lib/speech';
import { Icon } from '../components/Icon';
import { SyncSettings } from './SyncSettings';
import { ConnectionsSettings, HistorySettings, ShutdownSettings } from './ConnectionsSettings';

function Row({ title, desc, children }: { title: string; desc?: ReactNode; children: ReactNode }) {
  return (
    <div className="setting">
      <div className="setting-text">
        <b>{title}</b>
        {desc && <span>{desc}</span>}
      </div>
      {children}
    </div>
  );
}

type Look = 'leather' | 'night' | 'glass' | 'apple';
const LOOKS: Record<Look, Partial<S>> = {
  leather: { surface: 'flat', theme: 'light' },
  night: { surface: 'flat', theme: 'dark' },
  glass: { surface: 'glass', theme: 'system' },
  apple: { surface: 'apple', theme: 'system' },
};
const lookOf = (s: S): Look => (s.surface === 'apple' ? 'apple' : s.surface === 'glass' ? 'glass' : s.theme === 'dark' ? 'night' : 'leather');

function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map(([v, label]) => (
        <button key={String(v)} className={v === value ? 'on' : ''} role="radio" aria-checked={v === value} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span />
    </label>
  );
}

export function Settings() {
  const s = useApp((st) => st.settings);
  const set = (patch: Partial<S>) => updateSettings(patch);
  const [, force] = useState(0);
  useEffect(() => onVoicesChanged(() => force((n) => n + 1)), []);

  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <h1>Settings</h1>
          <div className="muted" style={{ marginTop: 4 }}>Stored on this device unless you turn on sync.</div>
        </div>
      </div>

      <div className="stack" style={{ '--gap': '22px' } as React.CSSProperties}>
        <section className="card card-pad">
          <h2>Study</h2>
          <Row title="Romaji leniency" desc={{
            strict: 'Only standard Hepburn: shi, chi, tsu, fu, gakkou / gakkō.',
            normal: 'Also accept si, ti, tu, hu, zi and long vowels written oo / ō.',
            lenient: 'Also accept missing long vowels (gakko) and missing n’.',
          }[s.leniency]}>
            <Seg value={s.leniency} options={[['strict', 'Strict'], ['normal', 'Normal'], ['lenient', 'Lenient']]} onChange={(v) => set({ leniency: v })} />
          </Row>
          <Row title="Session length" desc="Cards per study session (mistakes come back on top).">
            <Seg value={s.sessionLength} options={[[10, '10'], [20, '20'], [30, '30'], [50, '50']]} onChange={(v) => set({ sessionLength: v })} />
          </Row>
          <Row title="Daily goal" desc="Answers in the app, or minutes (your focus log or time in the app, whichever is more).">
            <span className="row" style={{ gap: 8 }}>
              <input className="input" style={{ width: 80 }} inputMode="numeric" value={String(s.dailyGoal)} onChange={(e) => set({ dailyGoal: Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1) })} aria-label="Daily goal" />
              <Seg value={s.goalUnit} options={[['answers', 'answers'], ['minutes', 'minutes']]} onChange={(v) => set({ goalUnit: v })} />
            </span>
          </Row>
          <Row title="Auto-advance" desc="Go to the next card automatically after a correct answer.">
            <Switch checked={s.autoAdvance} onChange={(v) => set({ autoAdvance: v })} label="Auto-advance" />
          </Row>
          {COURSES.map((c) => (
            <Row key={c.id} title={`Exam date · ${c.name}`} desc={c.id === COURSES[0].id ? 'Shows a countdown in Stats for that subject.' : undefined}>
              <input
                type="date"
                className="input"
                value={s.examDates?.[c.id] || (c.id === 'japanese' ? s.examDate : '')}
                onChange={(e) => set({ examDates: { ...s.examDates, [c.id]: e.target.value }, ...(c.id === 'japanese' ? { examDate: e.target.value } : {}) })}
                aria-label={`Exam date for ${c.name}`}
              />
            </Row>
          ))}
        </section>

        <section className="card card-pad">
          <h2>Sound</h2>
          <Row
            title="Pronunciation"
            desc={
              !speechSupported()
                ? 'This browser has no speech support.'
                : hasJapaneseVoice()
                  ? `Voice: ${voiceName()}`
                  : 'No Japanese voice found – on iPhone/Mac add one under Settings › Accessibility › Spoken Content › Voices.'
            }
          >
            <Switch checked={s.sound} onChange={(v) => set({ sound: v })} label="Sound" />
          </Row>
          <Row title="Voice speed" desc={`${s.voiceRate.toFixed(2)}× – slower helps with listening practice.`}>
            <div className="row">
              <input
                type="range"
                min={0.25}
                max={1.3}
                step={0.05}
                value={s.voiceRate}
                onChange={(e) => set({ voiceRate: Number(e.target.value) })}
                aria-label="Voice speed"
              />
              <button className="btn btn-sm" onClick={() => speak('にほんごを べんきょうしています。', s.voiceRate)}>
                <Icon name="speaker" size={16} /> Test
              </button>
            </div>
          </Row>
        </section>

        <section className="card card-pad">
          <h2>Display</h2>
          <Row title="Look" desc="Leather and Night: flat warm panels. Glass: frosted panels over leather. Apple: neutral panels, system font, blue accent.">
            <Seg value={lookOf(s)} options={[['leather', 'Leather'], ['night', 'Night'], ['glass', 'Glass'], ['apple', 'Apple']]} onChange={(v) => set(LOOKS[v])} />
          </Row>
          {(s.surface === 'glass' || s.surface === 'apple') && (
            <Row title="Appearance" desc="Light or dark – System follows your device.">
              <Seg value={s.theme} options={[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]} onChange={(v) => set({ theme: v })} />
            </Row>
          )}
          <Row title="Meaning language" desc="Language for word meanings and translations.">
            <Seg value={s.meaningLang} options={[['de', 'Deutsch'], ['en', 'English']]} onChange={(v) => set({ meaningLang: v })} />
          </Row>
          <Row title="Show kana and kanji" desc="Off: Japanese appears in romaji with German everywhere except script practice (hiragana, katakana, kanji).">
            <Switch checked={s.kanaLayer} onChange={(v) => set({ kanaLayer: v })} label="Show kana and kanji" />
          </Row>
          <Row title="Furigana" desc="Show readings above kanji (exercises that test the reading always hide them).">
            <Switch checked={s.furigana} onChange={(v) => set({ furigana: v })} label="Furigana" />
          </Row>
        </section>

        <ConnectionsSettings />
        <ShutdownSettings />
        <CoursePack />
        <SyncSettings />
        <Backup />
        <HistorySettings />

        <section className="card card-pad">
          <h2>Tutor</h2>
          <p className="muted small" style={{ margin: '6px 0 4px' }}>
            “Ask tutor” copies a prompt and opens Claude. Paste the link to a subject’s Claude Project to open that project instead of a new chat.
          </p>
          {COURSES.map((c) => (
            <Row key={c.id} title={c.name}>
              <input
                className="input"
                style={{ width: 'min(100%, 320px)' }}
                placeholder="https://claude.ai/project/…"
                value={s.tutorUrls?.[c.id] ?? ''}
                onChange={(e) => set({ tutorUrls: { ...s.tutorUrls, [c.id]: e.target.value.trim() } })}
                aria-label={`Claude Project link for ${c.name}`}
              />
            </Row>
          ))}
        </section>

        <section className="card card-pad">
          <h2>Reset</h2>
          <Row title="Reset one module" desc="Deletes the learning progress of a single module.">
            <ResetModule />
          </Row>
          <Row title="Erase everything" desc="Progress, settings, imported lists and recordings on this device.">
            <button
              className="btn btn-danger"
              onClick={() => confirm('Erase ALL data on this device? This cannot be undone – export a backup first.') && eraseEverything()}
            >
              <Icon name="trash" size={16} /> Erase
            </button>
          </Row>
        </section>

        <section className="card card-pad small muted stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <h2 style={{ color: 'var(--ink)' }}>About</h2>
          <p>
            Nihongo – a private, ad-free Japanese study app. Everything is stored on this device; if you connect sync, an encrypted copy
            is kept in your own GitHub repository. No other servers, no tracking.
          </p>
          <p>
            Stroke order data: <a href="https://kanjivg.tagaini.net" target="_blank" rel="noreferrer">KanjiVG</a> © Ulrich Apel, CC BY-SA 3.0.
            Kanji readings and meanings: <a href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project" target="_blank" rel="noreferrer">KANJIDIC2</a> © EDRDG, CC BY-SA 4.0.
          </p>
          <p>
            The private course pack (Minna no Nihongo vocabulary, mnemonic pictures from Tofugu’s “Learn Hiragana”) is copyrighted
            material for personal study only and is never published in readable form.
          </p>
        </section>
      </div>
    </div>
  );
}

function ResetModule() {
  const [id, setId] = useState(MODULES[0]?.id ?? '');
  return (
    <div className="row">
      <select className="input" value={id} onChange={(e) => setId(e.target.value)} aria-label="Module">
        {MODULES.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <button
        className="btn btn-danger"
        onClick={() => confirm(`Reset all progress in ${MODULES.find((m) => m.id === id)?.name}?`) && resetModule(id)}
      >
        Reset
      </button>
    </div>
  );
}

function CoursePack() {
  const status = useApp((s) => s.packStatus);
  const content = useApp((s) => s.content);
  const [available, setAvailable] = useState<boolean | 'offline' | null>(null);
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState<{ kind: 'good' | 'bad'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    packAvailable().then(setAvailable);
  }, []);
  const pics = Object.values(content.hints).reduce((n, h) => n + Object.keys(h).length, 0);
  const packWords = content.vocab.filter((v) => v.source === 'mnn').length;

  const unlock = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const pack = await unlockPack(pass);
      await installPack(pack);
      setPass('');
      setMsg({ kind: 'good', text: 'Unlocked – the pictures and your course vocab are now on this device.' });
    } catch (e) {
      setMsg({ kind: 'bad', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
      <h2>Course pack</h2>
      <p className="muted small">
        Your private content – Minna no Nihongo vocabulary and the hiragana memory pictures – is encrypted so it can live on the
        website without being public. Unlock it once per device with your passphrase.
      </p>
      <div className={`notice ${status === 'none' ? 'warn' : 'good'}`}>
        {status === 'none' && 'Not unlocked on this device.'}
        {status === 'bundled' && `Loaded from your local private folder: ${packWords} words, ${pics} pictures.`}
        {status === 'unlocked' && `Unlocked: ${packWords} words, ${pics} pictures.`}
      </div>
      {status !== 'bundled' && available === true && (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            unlock();
          }}
        >
          <input
            className="input"
            style={{ flex: '1 1 220px' }}
            type="password"
            placeholder="Passphrase"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
            aria-label="Course pack passphrase"
          />
          <button className="btn btn-primary" disabled={!pass || busy}>
            <Icon name="key" size={16} /> {busy ? 'Unlocking…' : status === 'unlocked' ? 'Update' : 'Unlock'}
          </button>
        </form>
      )}
      {status !== 'bundled' && available === false && <p className="faint small">No encrypted pack is deployed with this copy of the app.</p>}
      {status !== 'bundled' && available === 'offline' && <p className="faint small">You’re offline – connect to the internet to unlock the pack.</p>}
      {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}
      {status === 'unlocked' && (
        <div>
          <button className="btn btn-sm btn-danger" onClick={() => removePack()}>
            Remove from this device
          </button>
        </div>
      )}
    </section>
  );
}

function Backup() {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ kind: 'good' | 'bad'; text: string } | null>(null);
  return (
    <section className="card card-pad">
      <h2>Backup</h2>
      <Row title="Export progress" desc="Download all progress as a JSON file.">
        <button className="btn" onClick={() => exportBackup()}>
          <Icon name="download" size={16} /> Export
        </button>
      </Row>
      <Row title="Import progress" desc="Merge a backup file – for each card the most recent progress wins.">
        <button className="btn" onClick={() => file.current?.click()}>
          <Icon name="upload" size={16} /> Import
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              const r = await importBackup(f);
              setMsg({ kind: 'good', text: `Imported ${r.cards} cards and ${r.days} days of history.` });
            } catch (err) {
              setMsg({ kind: 'bad', text: (err as Error).message });
            }
          }}
        />
      </Row>
      {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}
    </section>
  );
}
