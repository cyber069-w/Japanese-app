/** The lessons of one CFA topic – each row opens the lesson window (guided version + original PDF). */
import { useEffect, useState } from 'react';
import { useApp } from '../../core/store';
import { navigate } from '../../lib/router';
import { Icon } from '../../components/Icon';
import { loadLessonPacks } from './lessonPacks';
import { rememberPdfPassphrase, savedKey } from './pdfs';

export function CfaTopicLessons({ topicId }: { topicId: string }) {
  const lessons = useApp((s) => s.content.cfaLessons).filter((l) => l.topic === topicId).sort((a, b) => (a.module ?? 0) - (b.module ?? 0));
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    void savedKey().then((k) => setLocked(!k));
    void loadLessonPacks(); // repairs an older copy (e.g. from sync) as soon as you open the topic
  }, []);

  if (!lessons.length) return locked ? <div className="card card-pad"><UnlockForm onDone={() => setLocked(false)} /></div> : <NoLessons />;

  return (
    <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
      {locked && <div className="card card-pad"><UnlockForm onDone={() => setLocked(false)} /></div>}
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
    </div>
  );
}

/** Enter the course-pack passphrase once on this device: unlocks the lessons (and PDFs) and loads the newest versions. */
function UnlockForm({ onDone }: { onDone: () => void }) {
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState('');
  const unlock = async () => {
    setMsg('Unlocking…');
    try {
      await rememberPdfPassphrase(pass);
      setPass('');
      const n = await loadLessonPacks();
      setMsg(n ? `${n} lessons loaded.` : 'Unlocked – your lessons are up to date.');
      onDone();
    } catch (e) {
      setMsg((e as Error).message || 'Wrong passphrase.');
    }
  };
  return (
    <form className="stack" style={{ '--gap': '10px' } as React.CSSProperties} onSubmit={(e) => { e.preventDefault(); void unlock(); }}>
      <p className="muted small" style={{ margin: 0 }}>
        Your CFA lessons (with the guided versions) come with the app, encrypted. Enter your course-pack passphrase once on this device –
        after that they load and update by themselves.
      </p>
      <input className="input" type="password" autoComplete="off" value={pass} onChange={(e) => setPass(e.target.value)} aria-label="Course pack passphrase" placeholder="Course-pack passphrase" />
      <div><button className="btn btn-primary" disabled={!pass.trim()}>Unlock lessons</button></div>
      {msg && <div className="small muted">{msg}</div>}
    </form>
  );
}

/** Unlocked, but no lessons for this topic yet. */
function NoLessons() {
  return (
    <div className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
      <p className="muted small" style={{ margin: 0 }}>No lessons for this topic yet.</p>
      <div><button className="btn" onClick={() => navigate('/m/cfa/t/import')}>Import a lesson</button></div>
    </div>
  );
}
