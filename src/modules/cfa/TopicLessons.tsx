/** The imported lessons of one CFA topic – each row opens the lesson window (guided version + original PDF). */
import { useEffect, useState } from 'react';
import { useApp } from '../../core/store';
import { navigate } from '../../lib/router';
import { Icon } from '../../components/Icon';
import { loadLessonPacks } from './lessonPacks';
import { rememberPdfPassphrase, savedKey } from './pdfs';

export function CfaTopicLessons({ topicId }: { topicId: string }) {
  const lessons = useApp((s) => s.content.cfaLessons).filter((l) => l.topic === topicId).sort((a, b) => (a.module ?? 0) - (b.module ?? 0));

  if (!lessons.length) return <NoLessons />;

  return (
    <div className="card card-pad">
      {lessons.map((l) => (
        <a className="mod-row lesson-row" key={l.id} href={`#/learn/${l.id}`}>
          <span className="serif">{l.module ?? '·'}</span>
          <span>
            <b>{l.title}</b>
            <span className="faint small"> · {l.learn ? 'guided + PDF' : 'PDF'} · {l.questions.length} questions</span>
          </span>
          <Icon name="right" size={18} />
        </a>
      ))}
    </div>
  );
}

/** No lessons for this topic: on a device without the key, unlock them right here; otherwise they simply aren't written yet. */
function NoLessons() {
  const [locked, setLocked] = useState(false);
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    void savedKey().then((k) => setLocked(!k));
  }, []);
  const unlock = async () => {
    setMsg('Unlocking…');
    try {
      await rememberPdfPassphrase(pass);
      setPass('');
      setLocked(false);
      const n = await loadLessonPacks();
      setMsg(n ? `${n} lessons loaded.` : 'Unlocked.');
    } catch (e) {
      setMsg((e as Error).message || 'Wrong passphrase.');
    }
  };
  return (
    <div className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
      {locked ? (
        <form className="stack" style={{ '--gap': '10px' } as React.CSSProperties} onSubmit={(e) => { e.preventDefault(); void unlock(); }}>
          <p className="muted small" style={{ margin: 0 }}>Your CFA lessons come with the app, encrypted. Enter your course-pack passphrase once on this device – after that they load and update by themselves.</p>
          <input className="input" type="password" autoComplete="off" value={pass} onChange={(e) => setPass(e.target.value)} aria-label="Course pack passphrase" placeholder="Course-pack passphrase" />
          <div><button className="btn btn-primary" disabled={!pass.trim()}>Unlock lessons</button></div>
        </form>
      ) : (
        <>
          <p className="muted small" style={{ margin: 0 }}>No lessons for this topic yet.</p>
          <div><button className="btn" onClick={() => navigate('/m/cfa/t/import')}>Import a lesson</button></div>
        </>
      )}
      {msg && <div className="small muted">{msg}</div>}
    </div>
  );
}
