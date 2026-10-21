/** The imported lessons of one CFA topic – each row opens the lesson window (guided version + original PDF). */
import { useApp } from '../../core/store';
import { navigate } from '../../lib/router';
import { Icon } from '../../components/Icon';

export function CfaTopicLessons({ topicId }: { topicId: string }) {
  const lessons = useApp((s) => s.content.cfaLessons).filter((l) => l.topic === topicId).sort((a, b) => (a.module ?? 0) - (b.module ?? 0));

  if (!lessons.length) {
    return (
      <div className="card card-pad">
        <p className="muted small" style={{ marginBottom: 12 }}>No lessons imported for this topic yet.</p>
        <button className="btn btn-primary" onClick={() => navigate('/m/cfa/t/import')}>Import a lesson</button>
      </div>
    );
  }

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
