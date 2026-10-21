/** The lesson's original PDF, shown in the lesson window: from this device, or downloaded once, decrypted and kept. */
import { lazy, Suspense, useEffect, useState } from 'react';
import { getPdf, NeedPassphraseError, rememberPdfPassphrase } from './pdfs';
import type { CfaLesson } from './lessons';

const PdfViewer = lazy(() => import('./PdfViewer'));

export function LessonPdfPanel({ lesson }: { lesson: CfaLesson }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [msg, setMsg] = useState('Loading…');
  const [askPass, setAskPass] = useState(false);
  const [pass, setPass] = useState('');

  const load = async () => {
    setMsg('Loading…');
    try {
      setBlob(await getPdf(lesson));
      setMsg('');
      setAskPass(false);
    } catch (e) {
      setAskPass(e instanceof NeedPassphraseError);
      setMsg(e instanceof NeedPassphraseError ? '' : (e as Error).message);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  const unlock = async () => {
    setMsg('Unlocking…');
    try {
      await rememberPdfPassphrase(pass, lesson);
      setPass('');
      await load();
    } catch (e) {
      setMsg((e as Error).message || 'Wrong passphrase.');
    }
  };

  return (
    <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
      {askPass && (
        <form className="stack" style={{ '--gap': '10px' } as React.CSSProperties} onSubmit={(e) => { e.preventDefault(); void unlock(); }}>
          <p className="muted small">The lesson PDFs are encrypted. Enter your course-pack passphrase once on this device – after that every PDF opens directly.</p>
          <input className="input" type="password" autoComplete="off" value={pass} onChange={(e) => setPass(e.target.value)} aria-label="Course pack passphrase" placeholder="Course-pack passphrase" />
          <div><button className="btn btn-primary" disabled={!pass.trim()}>Unlock</button></div>
        </form>
      )}
      {msg && <p className="muted small">{msg}</p>}
      {blob && (
        <Suspense fallback={<p className="muted small">Loading…</p>}>
          <PdfViewer blob={blob} />
        </Suspense>
      )}
    </div>
  );
}
