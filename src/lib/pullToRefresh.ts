import { useEffect, useState } from 'react';

/** Touch pull-down at the top of the page → onRefresh(). Returns whether a refresh is running. */
export function usePullToRefresh(onRefresh: () => Promise<unknown>, threshold = 80) {
  const [busy, setBusy] = useState(false);
  const [pull, setPull] = useState(0);
  useEffect(() => {
    let y0: number | null = null;
    const start = (e: TouchEvent) => { y0 = window.scrollY <= 0 ? e.touches[0].clientY : null; };
    const move = (e: TouchEvent) => { if (y0 !== null) setPull(Math.max(0, Math.min(threshold * 1.4, e.touches[0].clientY - y0))); };
    const end = async () => {
      const done = y0 !== null && pull >= threshold;
      y0 = null;
      setPull(0);
      if (done) { setBusy(true); try { await onRefresh(); } finally { setBusy(false); } }
    };
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', end);
    return () => { window.removeEventListener('touchstart', start); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', end); };
  }, [onRefresh, pull, threshold]);
  return { busy, pull, ready: pull >= threshold };
}
