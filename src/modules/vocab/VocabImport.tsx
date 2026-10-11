/** Import your own word lists (CSV file or pasted text) and manage them. */
import { useMemo, useRef, useState } from 'react';
import type { MeaningLang, StudyContext } from '../../core/types';
import { setUserVocab, useApp } from '../../core/store';
import { parseVocabCsv } from '../../lib/csv';
import { Icon } from '../../components/Icon';

const EXAMPLE = `kana,kanji,de,en,lesson
がくせい,学生,Student(in),student,1
ほん,本,Buch,book,2
いきます,行きます,gehen,go,5`;

export function VocabImport({ ctx }: { ctx: StudyContext }) {
  const userVocab = useApp((s) => s.userVocab);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [lang, setLang] = useState<MeaningLang>(ctx.settings.meaningLang);
  const [msg, setMsg] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const source = (name.trim() || 'my-list').replace(/[:\s]+/g, '-');
  const parsed = useMemo(() => (text.trim() ? parseVocabCsv(text, source, lang) : null), [text, source, lang]);
  const lists = useMemo(() => {
    const m = new Map<string, number>();
    userVocab.forEach((v) => m.set(v.source, (m.get(v.source) ?? 0) + 1));
    return [...m.entries()];
  }, [userVocab]);

  const save = async () => {
    if (!parsed?.entries.length) return;
    const replaced = userVocab.some((v) => v.source === source);
    await setUserVocab([...userVocab.filter((v) => v.source !== source), ...parsed.entries]);
    setMsg(`${replaced ? 'Updated' : 'Added'} “${source}” with ${parsed.entries.length} words. Find them under Vocabulary by lesson.`);
    setText('');
  };

  const template = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + EXAMPLE + '\n'], { type: 'text/csv' }));
    a.download = 'vocab-template.csv';
    a.click();
  };

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <section className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <h2>Format</h2>
        <p className="muted small">
          One word per line with a header row. Columns: <b>kana</b>, <b>kanji</b> (optional), <b>de</b> and/or <b>en</b> (or a single
          <b> meaning</b> column), <b>lesson</b>. Commas, semicolons (German Excel) and tabs all work. Brackets like
          <span lang="ja"> だれ (どなた)</span> or <span lang="ja">[お]みやげ</span> mark alternatives / optional parts.
        </p>
        <pre className="card" style={{ margin: 0, padding: 12, overflowX: 'auto', fontSize: '0.85rem', background: 'var(--surface-2)' }}>{EXAMPLE}</pre>
        <div>
          <button className="btn btn-sm" onClick={template}>
            <Icon name="download" size={16} /> Download template
          </button>
        </div>
      </section>

      <section className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <h2>Import</h2>
        <div className="row">
          <input className="input" style={{ flex: '1 1 200px' }} placeholder="List name, e.g. lesson-6" value={name} onChange={(e) => setName(e.target.value)} aria-label="List name" />
          <label className="small muted row" style={{ gap: 6 }}>
            plain “meaning” column is
            <select className="input" value={lang} onChange={(e) => setLang(e.target.value as MeaningLang)}>
              <option value="de">German</option>
              <option value="en">English</option>
            </select>
          </label>
          <button className="btn" onClick={() => file.current?.click()}>
            <Icon name="upload" size={16} /> Choose CSV file
          </button>
          <input
            ref={file}
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain"
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
        <textarea className="input" placeholder="…or paste your list here" value={text} onChange={(e) => setText(e.target.value)} aria-label="CSV text" spellCheck={false} />
        {parsed && (
          <>
            {parsed.errors.length > 0 && (
              <div className="notice warn small">
                {parsed.errors.slice(0, 5).map((e) => (
                  <div key={e}>{e}</div>
                ))}
                {parsed.errors.length > 5 && <div>… and {parsed.errors.length - 5} more</div>}
              </div>
            )}
            {parsed.entries.length > 0 && (
              <>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Kana</th>
                        <th>Kanji</th>
                        <th>Deutsch</th>
                        <th>English</th>
                        <th>Lesson</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.entries.slice(0, 8).map((e) => (
                        <tr key={e.id}>
                          <td lang="ja">{e.kana}</td>
                          <td lang="ja">{e.kanji}</td>
                          <td>{e.de}</td>
                          <td>{e.en}</td>
                          <td>{e.lesson}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="row">
                  <button className="btn btn-primary" onClick={save}>
                    Import {parsed.entries.length} words
                  </button>
                  {parsed.entries.length > 8 && <span className="faint small">showing 8 of {parsed.entries.length}</span>}
                </div>
              </>
            )}
          </>
        )}
        {msg && <div className="notice good">{msg}</div>}
      </section>

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
              <button
                className="btn btn-sm btn-danger"
                onClick={() => confirm(`Delete the list “${src}”? Your progress on these words stays in the backup only.`) && setUserVocab(userVocab.filter((v) => v.source !== src))}
              >
                <Icon name="trash" size={16} /> Delete
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
