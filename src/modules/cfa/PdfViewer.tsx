/** Shows a PDF inside the app with pdf.js (iPhone / iPad can't show a PDF in a page reliably). Loaded only when opened. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';

export default function PdfViewer({ blob }: { blob: Blob }) {
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  useEffect(() => {
    let cancelled = false;
    let destroy = () => {};
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;
        const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
        destroy = () => void task.destroy();
        const doc = await task.promise;
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
  }, [blob, zoom]);

  return (
    <div className="pdf-viewer">
      <div className="row pdf-tools">
        <button className="btn btn-sm" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} disabled={zoom <= 1} aria-label="Zoom out">−</button>
        <span className="small muted">{Math.round(zoom * 100)}%</span>
        <button className="btn btn-sm" onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))} aria-label="Zoom in">+</button>
        <span className="grow" />
        <a className="btn btn-sm" href={url} download="lesson.pdf"><Icon name="download" size={16} /> Save</a>
      </div>
      {error && <div className="notice warn small">{error}</div>}
      <div className="pdf-pages" ref={box} />
    </div>
  );
}
