/**
 * Shows a PDF inside the app with pdf.js (iPhone / iPad can't show a PDF in a page reliably). Loaded only when opened.
 * "Full screen" covers the app with just the pages on a neutral grey (no sidebar, no coloured background).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon';
import { openPdf } from './pdfjs';

export default function PdfViewer({ blob }: { blob: Blob }) {
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');
  const [full, setFull] = useState(false);
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  useEffect(() => {
    let cancelled = false;
    let destroy = () => {};
    (async () => {
      try {
        const { task, doc } = await openPdf(blob);
        destroy = () => void task.destroy();
        const el = box.current;
        if (!el || cancelled) return;
        el.replaceChildren();
        const width = el.clientWidth * zoom;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= doc.numPages && !cancelled; n++) {
          const page = await doc.getPage(n);
          const viewport = page.getViewport({ scale: (width / page.getViewport({ scale: 1 }).width) * dpr });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${zoom * 100}%`; // follows the box when the window size changes
          canvas.className = 'pdf-page';
          el.append(canvas);
          await page.render({ canvas, viewport }).promise;
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'The PDF could not be shown.');
      }
    })();
    return () => {
      cancelled = true;
      destroy();
    };
  }, [blob, zoom, full]); // full screen swaps the box, so draw again at the new width

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [full]);

  const viewer = (
    <div className={`pdf-viewer${full ? ' pdf-full' : ''}`} role={full ? 'dialog' : undefined} aria-modal={full || undefined}>
      <div className="row pdf-tools">
        <button className="btn btn-sm" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} disabled={zoom <= 1} aria-label="Zoom out">−</button>
        <span className="small pdf-zoom">{Math.round(zoom * 100)}%</span>
        <button className="btn btn-sm" onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))} aria-label="Zoom in">+</button>
        <span className="grow" />
        <a className="btn btn-sm" href={url} download="lesson.pdf"><Icon name="download" size={16} /> Save</a>
        {full ? (
          <button className="btn btn-sm" onClick={() => setFull(false)}><Icon name="x" size={16} /> Close</button>
        ) : (
          <button className="btn btn-sm" onClick={() => setFull(true)}><Icon name="eye" size={16} /> Full screen</button>
        )}
      </div>
      {error && <div className="notice warn small">{error}</div>}
      <div className="pdf-pages" ref={box} />
    </div>
  );
  // the animated page would become the containing block for position: fixed, so full screen goes into <body>
  return full ? createPortal(viewer, document.body) : viewer;
}
