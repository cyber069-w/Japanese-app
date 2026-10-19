/** A draft made overnight by Claude Code on the Mac: read it, then Accept (imports / copies) or Ignore. Nothing enters your decks without a tap. */
import { useState } from 'react';
import { accept, ignore } from '../../core/canvas';
import { setCfaLessons, getState } from '../../core/store';
import { parseCfaLessons } from '../../modules/cfa/lessons';
import { logHistory } from '../../core/history';
import { navigate } from '../../lib/router';
import { Sheet } from '../Sheet';

const LABEL = { 'cfa-json': 'CFA lesson pack', 'vocab-csv': 'Vocabulary list (romaji;German)', summary: 'Summary and questions' } as const;

export function DraftSheet({ draft, onClose }: { draft: { id: string; subject: string; file: string; format: string; text: string }; onClose: () => void }) {
  const [msg, setMsg] = useState('');
  const fmt = draft.format as keyof typeof LABEL;
  const parsed = fmt === 'cfa-json' ? parseCfaLessons(draft.text) : null;
  const doAccept = async () => {
    if (fmt === 'cfa-json' && parsed?.lessons.length) {
      const ids = new Set(parsed.lessons.map((l) => l.id));
      await setCfaLessons([...getState().content.cfaLessons.filter((l) => !ids.has(l.id)), ...parsed.lessons]);
      setMsg(`Imported ${parsed.lessons.length} lesson${parsed.lessons.length === 1 ? '' : 's'}.`);
    } else {
      await navigator.clipboard?.writeText(draft.text).catch(() => {});
      setMsg(fmt === 'vocab-csv' ? 'Copied – paste it in the vocabulary import (opening it now).' : 'Copied to the clipboard.');
      if (fmt === 'vocab-csv') setTimeout(() => navigate('/m/vocab/t/import'), 900);
    }
    logHistory('import', `Draft accepted: ${draft.file}`);
    accept(draft.id);
    setTimeout(onClose, 1200);
  };
  return (
    <Sheet title={`Draft: ${draft.file}`} onClose={onClose}>
      <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <div className="muted small">{draft.subject} · {LABEL[fmt] ?? draft.format} · written by Claude Code on your Mac. Check it before you accept.</div>
        {parsed && parsed.errors.length > 0 && <div className="notice warn small">{parsed.errors.join(' ')}</div>}
        <textarea className="input" readOnly value={draft.text} style={{ minHeight: 220 }} aria-label="Draft text" />
        {msg && <div className="notice good small" role="status">{msg}</div>}
        <div className="row">
          <button className="btn btn-primary" onClick={() => void doAccept()} disabled={fmt === 'cfa-json' && !parsed?.lessons.length}>{fmt === 'cfa-json' ? 'Accept and import' : 'Accept and copy'}</button>
          <button className="btn btn-ghost" onClick={() => { ignore(draft.id); onClose(); }}>Ignore</button>
        </div>
      </div>
    </Sheet>
  );
}
