/**
 * Import word lists: CSV / TSV files, Quizlet exports (term ⇥ definition) or pasted text.
 * You check the column mapping and a preview, choose what happens with duplicates, and can undo the last change.
 */
import { logHistory } from '../../core/history';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MeaningLang, StudyContext, VocabEntry } from '../../core/types';
import { setUserVocab, useApp } from '../../core/store';
import { storage } from '../../core/db';
import { FIELD_LABELS, dupKey, guessColumns, parseCsv, rowsToEntries, type VocabField } from '../../lib/csv';
import { phraseRomaji } from '../../lib/romaji';
import { Icon } from '../../components/Icon';

const FIELDS: VocabField[] = ['romaji', 'kana', 'kanji', 'de', 'en', 'meaning', 'lesson', 'tags', ''];
const EXAMPLE = `romaji,de,lesson
gakusei,Student(in),1
hon,Buch,2
ikimasu,gehen,5`;

interface Undo { before: VocabEntry[]; label: string }

export function VocabImport({ ctx }: { ctx: StudyContext }) {
  const userVocab = useApp((s) => s.userVocab);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [lang, setLang] = useState<MeaningLang>(ctx.settings.meaningLang);
  const [lesson, setLesson] = useState('');
  const [hasHeader, setHasHeader] = useState<boolean | null>(null);
  const [mapping, setMapping] = useState<VocabField[] | null>(null);
  const [dupMode, setDupMode] = useState<'keep' | 'skip'>('keep');
  const [replace, setReplace] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void storage.get<Undo>('vocab:undo').then((u) => setUndo(u ?? null));
  }, []);

  const source = (name.trim() || 'my-list').replace(/[:\s]+/g, '-');
  const rows = useMemo(() => (text.trim() ? parseCsv(text) : []), [text]);
  const guess = useMemo(() => guessColumns(rows), [rows]);
  // a new text resets manual choices
  useEffect(() => {
    setHasHeader(null);
    setMapping(null);
  }, [text]);
  const header = hasHeader ?? guess.hasHeader;
  const cols = mapping ?? guess.mapping;
  const body = header ? rows.slice(1) : rows;
  const existingList = userVocab.filter((v) => v.source === source);
  const appendFrom = replace ? 0 : existingList.length;

  const result = useMemo(
    () => rowsToEntries(body, cols, { source, meaningLang: lang, lesson: lesson === '' ? undefined : Number(lesson), firstLine: header ? 2 : 1, startPos: appendFrom }),
    [body, cols, source, lang, lesson, header, appendFrom],
  );
  // duplicates: same word already in the app (other lists / course pack / this list unless replaced) or earlier in this file
  const dupes = useMemo(() => {
    const known = new Set(ctx.content.vocab.filter((v) => !(replace && v.source === source)).map((v) => dupKey(v.kana)));
    const out = new Set<number>();
    result.entries.forEach((e, i) => {
      const k = dupKey(e.kana);
      if (known.has(k)) out.add(i);
      known.add(k);
    });
    return out;
  }, [result, ctx.content.vocab, replace, source]);
  const toImport = dupMode === 'skip' ? result.entries.filter((_, i) => !dupes.has(i)).map((e, i) => ({ ...e, pos: appendFrom + i })) : result.entries;
  const missing = !cols.includes('kana') && !cols.includes('romaji') ? 'Choose which column holds the Japanese word (romaji or kana).' : !cols.some((c) => c === 'de' || c === 'en' || c === 'meaning') ? 'Choose which column holds the meaning.' : null;

  const remember = async (u: Undo) => {
    setUndo(u);
    await storage.set('vocab:undo', u);
  };
  const save = async () => {
    if (!toImport.length || missing) return;
    await remember({ before: userVocab, label: `import into “${source}”` });
    const kept = replace ? userVocab.filter((v) => v.source !== source) : userVocab;
    await setUserVocab([...kept, ...toImport]);
    setMsg(
      `${body.length} rows in the file → ${toImport.length} words ${replace ? 'replace' : 'added to'} “${source}”` +
        (dupMode === 'skip' && dupes.size ? `, ${dupes.size} duplicates skipped` : '') +
        (result.errors.length ? `, ${result.errors.length} rows with errors not imported` : '') +
        '.',
    );
    logHistory('import', `Vocab import into “${source}”: ${toImport.length} words`);
    setText('');
  };
  const doUndo = async () => {
    if (!undo) return;
    await setUserVocab(undo.before);
    setMsg(`Undone: ${undo.label}.`);
    setUndo(null);
    await storage.set('vocab:undo', null);
  };
  const removeList = async (src: string) => {
    await remember({ before: userVocab, label: `delete “${src}”` });
    await setUserVocab(userVocab.filter((v) => v.source !== src));
    setMsg(`Deleted “${src}”.`);
  };
  const paste = async () => {
    try {
      setText(await navigator.clipboard.readText());
    } catch {
      setMsg('The browser did not allow reading the clipboard – paste into the box with ⌘V / Ctrl+V instead.');
    }
  };
  const template = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + EXAMPLE + '\n'], { type: 'text/csv' }));
    a.download = 'vocab-template.csv';
    a.click();
  };

  const lists = useMemo(() => {
    const m = new Map<string, number>();
    userVocab.forEach((v) => m.set(v.source, (m.get(v.source) ?? 0) + 1));
    return [...m.entries()];
  }, [userVocab]);
  const width = Math.max(0, ...rows.slice(0, 11).map((r) => r.length));

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      {undo && (
        <div className="notice row" style={{ justifyContent: 'space-between' }}>
          <span className="small">Last change: {undo.label}</span>
          <button className="btn btn-sm" onClick={doUndo}><Icon name="undo" size={15} /> Undo</button>
        </div>
      )}

      <section className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <h2>1 · Add your list</h2>
        <p className="muted small">
          CSV or TSV file, a Quizlet export (term ⇥ definition, no header) or text from the clipboard. Romaji is turned into kana for you – a capital first
          letter means katakana (Itaria), ō/ū are long vowels. The order of your file is kept.
        </p>
        <div className="row">
          <button className="btn" onClick={() => file.current?.click()}><Icon name="upload" size={16} /> Choose file</button>
          <button className="btn" onClick={paste}><Icon name="copy" size={16} /> Paste from clipboard</button>
          <button className="btn btn-ghost btn-sm" onClick={template}><Icon name="download" size={15} /> Template</button>
          <input
            ref={file}
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              setText(await f.text());
              if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
            }}
          />
        </div>
        <textarea className="input" placeholder="…or paste your list here" value={text} onChange={(e) => setText(e.target.value)} aria-label="List text" spellCheck={false} />
      </section>

      {rows.length > 0 && (
        <section className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <h2>2 · Check the columns</h2>
          <div className="row">
            <label className="small row" style={{ gap: 6 }}>
              <input type="checkbox" checked={header} onChange={(e) => setHasHeader(e.target.checked)} /> First row is a header
            </label>
            <label className="small muted row" style={{ gap: 6 }}>
              “Meaning” is
              <select className="input" value={lang} onChange={(e) => setLang(e.target.value as MeaningLang)}>
                <option value="de">German</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="small muted row" style={{ gap: 6 }}>
              Lesson for rows without one
              <input className="input" style={{ width: 70 }} inputMode="numeric" value={lesson} placeholder="0" onChange={(e) => setLesson(e.target.value.replace(/\D/g, ''))} />
            </label>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  {Array.from({ length: width }, (_, c) => (
                    <th key={c}>
                      <select
                        className="input"
                        value={cols[c] ?? ''}
                        aria-label={`Column ${c + 1}`}
                        onChange={(e) => {
                          const next = Array.from({ length: width }, (_, i) => cols[i] ?? '');
                          next[c] = e.target.value as VocabField;
                          setMapping(next);
                        }}
                      >
                        {FIELDS.map((f) => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
                      </select>
                    </th>
                  ))}
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {body.slice(0, 10).map((r, i) => {
                  const line = (header ? 2 : 1) + i;
                  const err = result.errors.find((e) => e.line === line);
                  const entryIndex = i - result.errors.filter((e) => e.line < line).length;
                  const entry = err ? null : result.entries[entryIndex];
                  return (
                    <tr key={i}>
                      <td className="faint">{line}</td>
                      {Array.from({ length: width }, (_, c) => <td key={c}>{r[c]}</td>)}
                      <td className="small">
                        {err ? <span className="tag tag-warn">{err.reason}</span> : entry ? <>{phraseRomaji(entry.kana)}{dupes.has(entryIndex) && <span className="tag" style={{ marginLeft: 6 }}>duplicate</span>}</> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {body.length > 10 && <span className="faint small">Preview of the first 10 of {body.length} rows.</span>}
        </section>
      )}

      {rows.length > 0 && (
        <section className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <h2>3 · Import</h2>
          <div className="row">
            <input className="input" style={{ flex: '1 1 200px' }} placeholder="List name, e.g. kapitel-6" value={name} onChange={(e) => setName(e.target.value)} aria-label="List name" />
            {existingList.length > 0 && (
              <label className="small row" style={{ gap: 6 }}>
                <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> Replace the {existingList.length} words already in “{source}” (otherwise they are added at the end)
              </label>
            )}
          </div>
          {dupes.size > 0 && (
            <div className="row small">
              <span>{dupes.size} word{dupes.size === 1 ? ' is' : 's are'} already in your vocabulary or repeated in the file:</span>
              <button className={`chip${dupMode === 'keep' ? ' on' : ''}`} onClick={() => setDupMode('keep')}>Import anyway</button>
              <button className={`chip${dupMode === 'skip' ? ' on' : ''}`} onClick={() => setDupMode('skip')}>Skip them</button>
            </div>
          )}
          {result.errors.length > 0 && (
            <details className="notice warn small">
              <summary>{result.errors.length} row{result.errors.length === 1 ? '' : 's'} can’t be imported</summary>
              {result.errors.slice(0, 30).map((e) => (
                <div key={e.line}>Line {e.line}: {e.reason} – “{e.text}”</div>
              ))}
            </details>
          )}
          {missing ? (
            <div className="notice warn small">{missing}</div>
          ) : (
            <div className="row">
              <button className="btn btn-primary" onClick={save} disabled={!toImport.length}>Import {toImport.length} words</button>
              <span className="faint small">{body.length} rows in the file</span>
            </div>
          )}
        </section>
      )}

      {msg && <div className="notice good">{msg}</div>}

      <section className="card card-pad">
        <h2>Your lists</h2>
        {lists.length === 0 ? (
          <p className="muted small" style={{ marginTop: 8 }}>No imported lists yet.</p>
        ) : (
          lists.map(([src, n]) => (
            <div className="setting" key={src}>
              <div className="setting-text">
                <b>{src}</b>
                <span>{n} words</span>
              </div>
              <button className="btn btn-sm btn-danger" onClick={() => removeList(src)}>
                <Icon name="trash" size={16} /> Delete
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
