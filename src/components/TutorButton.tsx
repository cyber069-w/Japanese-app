import { useState } from 'react';
import { askTutor, type TutorRequest } from '../lib/tutor';
import { Icon } from './Icon';

/** Copies a prompt with this context and opens Claude (see lib/tutor.ts). */
export function TutorButton({ request, label = 'Ask tutor', small }: { request: () => TutorRequest; label?: string; small?: boolean }) {
  const [note, setNote] = useState('');
  return (
    <span className="row" style={{ gap: 8 }}>
      <button
        className={`btn${small ? ' btn-sm' : ''}`}
        onClick={async () => setNote((await askTutor(request())) ? 'Prompt copied – paste it into Claude with ⌘V / Ctrl+V.' : 'Claude opened – the browser blocked copying, so describe your question there.')}
      >
        <Icon name="sparkle" size={small ? 15 : 17} /> {label}
      </button>
      {note && <span className="faint tiny" role="status">{note}</span>}
    </span>
  );
}
