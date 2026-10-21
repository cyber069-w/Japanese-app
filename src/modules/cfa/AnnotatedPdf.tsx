/**
 * The lesson PDF to study on: every page with selectable text (pdf.js text layer) and the lesson's notes – highlighted
 * quotes with an explanation beside the page. Mark any text (a word, a sentence, a formula line) or drag a box around a
 * diagram or formula ("Mark area") and tap Explain: what the lesson already explains shows at once, the rest goes to
 * the tutor (today: Claude with the marked text or image; later the API inside the app). Loaded only when opened.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon';
import { getPdf, NeedPassphraseError } from './pdfs';
import { openPdf } from './pdfjs';
import { findQuote } from './annotate';
import { ExplainSheet, type Marked } from './Explain';
import type { CfaAnnotation, CfaLesson } from './lessons';

type Lang = 'en' | 'de';
type Pdf = Awaited<ReturnType<typeof openPdf>>;
/** A highlight, in % of the page's width and height. */
interface Box { left: number; top: number; width: number; height: number }

const KIND_LABEL: Record<CfaAnnotation['kind'], [string, string]> = {
  word: ['Word', 'Begriff'],
  plain: ['In plain words', 'Einfach gesagt'],
  formula: ['Formula', 'Formel'],
  trap: ['Exam trap', 'Prüfungsfalle'],
};

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode */
  }
};

export default function AnnotatedPdf({ lesson }: { lesson: CfaLesson }) {
  const notes = useMemo(() => lesson.learn?.annotations ?? [], [lesson]);
  const [pdf, setPdf] = useState<Pdf | null>(null);
  const [msg, setMsg] = useState('Loading…');
  const [lang, setLangState] = useState<Lang>(() => (read('cfa-learn-lang') === 'de' ? 'de' : 'en'));
  const [areaMode, setAreaMode] = useState(false);
  const [selection, setSelection] = useState<{ text: string; page: number } | null>(null);
  const [marked, setMarked] = useState<Marked | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const setLang = (l: Lang) => {
    setLangState(l);
    write('cfa-learn-lang', l);
  };

  useEffect(() => {
    let cancelled = false;
    let opened: Pdf | null = null;
    (async () => {
      try {
        opened = await openPdf(await getPdf(lesson));
        if (cancelled) return void opened.task.destroy();
        setPdf(opened);
        setMsg('');
      } catch (e) {
        if (!cancelled) setMsg(e instanceof NeedPassphraseError ? 'Open the “Original PDF” tab once and enter your passphrase – then the pages appear here.' : (e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
      void opened?.task.destroy();
    };
  }, [lesson]);

  // text marked on a page → the Explain bar. Tapping the bar ends the selection (always on iPad), so the bar keeps
  // the marked text a moment longer and is not hidden while it is being pressed.
  const pressing = useRef(false);
  useEffect(() => {
    let hide: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      const sel = document.getSelection();
      const node = sel && !sel.isCollapsed ? sel.anchorNode : null;
      const page = node?.parentElement?.closest<HTMLElement>('[data-page]');
      const text = sel?.toString().replace(/\s+/g, ' ').trim() ?? '';
      clearTimeout(hide);
      if (page && root.current?.contains(page) && text) setSelection({ text, page: Number(page.dataset.page) });
      else hide = setTimeout(() => !pressing.current && setSelection(null), 700);
    };
    document.addEventListener('selectionchange', onChange);
    return () => {
      clearTimeout(hide);
      document.removeEventListener('selectionchange', onChange);
    };
  }, []);

  const pageText = async (n: number) => {
    if (!pdf) return '';
    const t = await (await pdf.doc.getPage(n)).getTextContent();
    return t.items.map((it) => ('str' in it ? it.str : '')).join(' ').replace(/\s+/g, ' ').trim();
  };

  const explainSelection = async () => {
    pressing.current = false;
    if (!selection) return;
    const { text, page } = selection;
    setSelection(null);
    document.getSelection()?.removeAllRanges();
    setMarked({ kind: 'text', text, page, pageText: await pageText(page) });
  };

  const pick = (id: string, scrollTo: 'note' | 'mark') => {
    setActive(id);
    document.getElementById(`${scrollTo}-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="anno" ref={root}>
      <div className="row anno-tools">
        <button className={`btn btn-sm${areaMode ? ' btn-primary' : ''}`} aria-pressed={areaMode} onClick={() => setAreaMode(!areaMode)}>
          <Icon name="shapes" size={16} /> {areaMode ? 'Drag a box around it…' : 'Mark area'}
        </button>
        <span className="faint small grow">Mark any text to get it explained · “Mark area” for diagrams and formulas</span>
        <div className="seg" role="group" aria-label="Language of the notes">
          <button className={lang === 'en' ? 'on' : ''} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
          <button className={lang === 'de' ? 'on' : ''} aria-pressed={lang === 'de'} onClick={() => setLang('de')}>Deutsch</button>
        </div>
      </div>
      {msg && <p className="muted small">{msg}</p>}
      {pdf &&
        Array.from({ length: pdf.doc.numPages }, (_, i) => i + 1).map((n) => (
          <PageView
            key={n}
            pdf={pdf}
            n={n}
            notes={notes.filter((a) => a.page === n)}
            lang={lang}
            areaMode={areaMode}
            active={active}
            onPick={pick}
            onArea={async (image, text) => {
              setAreaMode(false);
              setMarked({ kind: 'area', image, text, page: n, pageText: await pageText(n) });
            }}
          />
        ))}

      {selection && !marked &&
        // into <body>: the animated page would otherwise become the containing block for position: fixed
        createPortal(
          <div className="anno-selbar" role="region" aria-label="Marked text" onPointerDown={() => (pressing.current = true)} onPointerCancel={() => (pressing.current = false)}>
            <span className="grow anno-selbar-text">“{selection.text.length > 90 ? `${selection.text.slice(0, 90)}…` : selection.text}”</span>
            <button className="btn btn-primary btn-sm" onMouseDown={(e) => e.preventDefault()} onClick={() => void explainSelection()}>
              <Icon name="sparkle" size={16} /> Explain
            </button>
          </div>,
          document.body,
        )}
      {marked && <ExplainSheet lesson={lesson} marked={marked} lang={lang} onClose={() => setMarked(null)} />}
    </div>
  );
}

function PageView({ pdf, n, notes, lang, areaMode, active, onPick, onArea }: {
  pdf: Pdf;
  n: number;
  notes: CfaAnnotation[];
  lang: Lang;
  areaMode: boolean;
  active: string | null;
  onPick: (id: string, scrollTo: 'note' | 'mark') => void;
  onArea: (image: Blob, text: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvasBox = useRef<HTMLDivElement>(null);
  const textBox = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [marks, setMarks] = useState<Box[][]>([]);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const de = lang === 'de';
  const id = (i: number) => `${n}-${i}`;

  // redraw when the page area changes width (rotation, window size)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.round(el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!width) return;
    let cancelled = false;
    let textLayer: { cancel: () => void } | null = null;
    (async () => {
      const page = await pdf.doc.getPage(n);
      const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = '100%';
      canvas.className = 'pdf-page';
      await page.render({ canvas, viewport: page.getViewport({ scale: viewport.scale * dpr }) }).promise;
      const text = await page.getTextContent();
      if (cancelled) return;
      canvasBox.current?.replaceChildren(canvas);

      // selectable text on top of the picture
      const tl = textBox.current!;
      tl.replaceChildren();
      tl.style.setProperty('--total-scale-factor', String(viewport.scale));
      const layer = new pdf.pdfjs.TextLayer({ textContentSource: text, container: tl, viewport });
      textLayer = layer;
      await layer.render();

      // the notes' highlights, in % of the page
      const items = text.items.filter((it): it is (typeof text.items)[number] & { str: string; transform: number[]; width: number } => 'str' in it);
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.font = '100px system-ui, sans-serif';
      const span = (str: string, from: number, to: number) => {
        const full = ctx.measureText(str).width || 1;
        return [ctx.measureText(str.slice(0, from)).width / full, ctx.measureText(str.slice(0, to)).width / full];
      };
      const [vw, vh] = [viewport.width / 100, viewport.height / 100];
      setMarks(
        notes.map((note) =>
          findQuote(items, note.quote).map((h) => {
            const it = items[h.item];
            const t = pdf.pdfjs.Util.transform(viewport.transform, it.transform);
            const fontH = Math.hypot(t[2], t[3]);
            const w = it.width * viewport.scale;
            const [a, b] = span(it.str, h.from, h.to);
            return { left: (t[4] + w * a) / vw, top: (t[5] - fontH) / vh, width: (w * (b - a)) / vw, height: (fontH * 1.15) / vh };
          }),
        ),
      );
    })().catch(() => {});
    return () => {
      cancelled = true;
      textLayer?.cancel();
    };
    // notes belong to the page; they only change with a new lesson version
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, n, width]);

  // "Mark area": drag a box, then cut that part of the page out as an image
  const pos = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: Math.min(Math.max(e.clientX - r.left, 0), r.width), y: Math.min(Math.max(e.clientY - r.top, 0), r.height) };
  };
  const finishArea = () => {
    const d = drag;
    setDrag(null);
    const canvas = canvasBox.current?.querySelector('canvas');
    if (!d || !canvas) return;
    const [x, y, w, h] = [Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0)];
    if (w < 12 || h < 12) return;
    const k = canvas.width / canvas.clientWidth;
    const out = document.createElement('canvas');
    out.width = Math.round(w * k);
    out.height = Math.round(h * k);
    out.getContext('2d')!.drawImage(canvas, x * k, y * k, w * k, h * k, 0, 0, out.width, out.height);
    // the page text inside the box, so words and notes of the lesson can be matched too
    const page = box.current!.getBoundingClientRect();
    const inside = [...(textBox.current?.querySelectorAll('span') ?? [])].filter((el) => {
      const r = el.getBoundingClientRect();
      const [cx, cy] = [r.left + r.width / 2 - page.left, r.top + r.height / 2 - page.top];
      return cx >= x && cx <= x + w && cy >= y && cy <= y + h;
    });
    const text = inside.map((el) => el.textContent ?? '').join(' ').replace(/\s+/g, ' ').trim();
    out.toBlob((b) => b && onArea(b, text), 'image/png');
  };

  return (
    <section className={`anno-row${notes.length ? '' : ' no-notes'}`}>
      <div className="anno-page" ref={box} data-page={n}>
        <div ref={canvasBox} className="anno-canvas" />
        <div className="anno-marks" aria-hidden="true">
          {marks.map((rects, i) => rects.map((r, j) => (
            <span key={`${i}-${j}`} className={`anno-mark ${notes[i]?.kind}${active === id(i) ? ' on' : ''}`} style={{ left: `${r.left}%`, top: `${r.top}%`, width: `${r.width}%`, height: `${r.height}%` }} />
          )))}
        </div>
        <div ref={textBox} className="textLayer" />
        <div className="anno-badges">
          {marks.map((rects, i) => rects[0] && (
            <button key={i} id={`mark-${id(i)}`} type="button" className={`anno-num ${notes[i]?.kind}`} style={{ left: `${rects[0].left}%`, top: `${rects[0].top}%` }} onClick={() => onPick(id(i), 'note')} aria-label={`Note ${i + 1}`}>
              {i + 1}
            </button>
          ))}
        </div>
        {areaMode && (
          <div
            className="anno-area"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const p = pos(e);
              setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
            }}
            onPointerMove={(e) => {
              if (!drag) return;
              const p = pos(e);
              setDrag({ ...drag, x1: p.x, y1: p.y });
            }}
            onPointerUp={finishArea}
          >
            {drag && <div className="anno-area-box" style={{ left: Math.min(drag.x0, drag.x1), top: Math.min(drag.y0, drag.y1), width: Math.abs(drag.x1 - drag.x0), height: Math.abs(drag.y1 - drag.y0) }} />}
          </div>
        )}
        <span className="anno-pageno faint tiny">Page {n}</span>
      </div>
      {notes.length > 0 && (
        <ol className="anno-notes">
          {notes.map((note, i) => (
            <li key={i} id={`note-${id(i)}`} className={`anno-note ${note.kind}${active === id(i) ? ' on' : ''}${marks[i] && !marks[i].length ? ' unplaced' : ''}`} onClick={() => onPick(id(i), 'mark')}>
              <div className="row anno-note-head">
                <span className={`anno-num static ${note.kind}`}>{i + 1}</span>
                <span className="eyebrow">{KIND_LABEL[note.kind][de ? 1 : 0]}</span>
              </div>
              {(de ? note.de?.title ?? note.title : note.title) && <b>{de ? note.de?.title ?? note.title : note.title}</b>}
              <p>{de ? note.de?.note ?? note.note : note.note}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
