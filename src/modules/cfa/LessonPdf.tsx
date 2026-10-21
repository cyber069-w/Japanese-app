/** "Original PDF" button + sheet: gets the lesson's PDF (this device, or once from the sync repo) and shows it. */
import { lazy, Suspense, useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { Icon } from '../../components/Icon';
import { getPdf } from './pdfs';
import type { CfaLesson } from './lessons';

const PdfViewer = lazy(() => import('./PdfViewer'));

export function LessonPdfButton({ lesson, className = 'btn btn-sm' }: { lesson: CfaLesson; className?: string }) {
  const [open, setOpen] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [msg, setMsg] = useState('');
  const show = async () => {
    setOpen(true);
    setMsg('Loading…');
    try {
      setBlob(await getPdf(lesson));
      setMsg('');
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  return (
    <>
      <button className={className} onClick={show}><Icon name="text" size={16} /> PDF</button>
      {open && (
        <Sheet title={lesson.title} onClose={() => setOpen(false)}>
          {msg && <p className="muted small">{msg}</p>}
          {blob && (
            <Suspense fallback={<p className="muted small">Loading…</p>}>
              <PdfViewer blob={blob} />
            </Suspense>
          )}
        </Sheet>
      )}
    </>
  );
}
