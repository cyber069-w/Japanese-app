/** One module: choose rows/lessons, pick an exercise, open tools. */
import { GlyphIcon, ModuleGlyph } from '../components/GlyphIcon';
import { Heatmap } from '../components/Heatmap';
import { useMemo, useState } from 'react';
import { getState, setSelection, useApp } from '../core/store';
import { useCtx, useDueCounts, useSelection } from '../core/hooks';
import { buildReviewQueue, buildStudyQueue, buildWeakQueue, exerciseItems, filterByGroups, weakCardIds } from '../core/session';
import { startSession } from '../core/sessionConfig';
import { moduleTotals } from '../core/stats';
import type { Exercise, FilterGroup, StudyModule } from '../core/types';
import { getModule, MODULES } from '../modules';
import { courseOfModule, isUnverified, moduleInfo } from '../courses';
import { navigate } from '../lib/router';
import { Icon } from '../components/Icon';

export function ModuleScreen({ id }: { id: string }) {
  const mod = getModule(id);
  if (!mod) {
    return (
      <div className="page">
        <div className="empty">Module not found.</div>
      </div>
    );
  }
  if (moduleInfo(mod.id).soon) return <SoonView mod={mod} />;
  return <ModuleView mod={mod} />;
}

/** A module the course marks as "coming later": nothing to study, progress kept. */
function SoonView({ mod }: { mod: StudyModule }) {
  return (
    <div className="page">
      <a href="#/study" className="btn btn-ghost btn-sm" style={{ marginLeft: -10, marginBottom: 14 }}>
        <Icon name="left" size={16} /> {courseOfModule(mod.id).name}
      </a>
      <div className="page-head">
        <div className="module-glyph" style={{ width: 64, height: 64, fontSize: 34 }}><ModuleGlyph mod={mod} /></div>
        <div className="grow">
          <h1>{mod.name}</h1>
          <div className="muted" style={{ marginTop: 4 }}>Coming later. Your progress so far is kept and returns with it.</div>
        </div>
      </div>
    </div>
  );
}

function ModuleView({ mod }: { mod: StudyModule }) {
  const ctx = useCtx();
  const cards = useApp((s) => s.cards);
  const days = useApp((s) => s.days);
  const due = useDueCounts().per[mod.id] ?? 0;
  const selected = useSelection(mod);
  const groups = useMemo(() => (mod.groups ? mod.groups(ctx) : []), [mod, ctx]);
  const totals = moduleTotals(days, mod.id);
  const weak = useMemo(() => weakCardIds(cards, Date.now(), mod.id).length, [cards, mod.id]);
  const empty = mod.emptyState?.(ctx);
  const [len, setLen] = useState<number>(() => {
    try { return Number(localStorage.getItem('nihongo:len')) || 0; } catch { return 0; }
  });
  const chooseLen = (n: number) => {
    setLen(n);
    try { localStorage.setItem('nihongo:len', String(n)); } catch { /* private mode */ }
  };
  const length = len || ctx.settings.sessionLength;

  const start = (ex: Exercise) => {
    const pool = filterByGroups(exerciseItems(ex, ctx), mod.groups ? selected : undefined);
    // read the latest cards each time, so "Another round" uses fresh progress
    const build = () => buildStudyQueue(mod, ex, ctx, selected, getState().cards, Date.now(), length);
    startSession({
      title: `${mod.name} · ${ex.name}`,
      cards: build(),
      pools: { [`${mod.id}:${ex.id}`]: pool },
      back: `/m/${mod.id}`,
      rebuild: build,
    });
  };

  return (
    <div className="page">
      <a href="#/study" className="btn btn-ghost btn-sm" style={{ marginLeft: -10, marginBottom: 14 }}>
        <Icon name="left" size={16} /> {courseOfModule(mod.id).name}
      </a>
      <div className="page-head">
        <div className="module-glyph" style={{ width: 64, height: 64, fontSize: 34 }}><ModuleGlyph mod={mod} /></div>
        <div className="grow">
          <h1>{mod.name}</h1>
          <div className="muted" style={{ marginTop: 4 }}>{mod.description}</div>
        </div>
        <div className="row">
          {due > 0 && (
            <button
              className="btn btn-primary"
              onClick={() => startSession({ title: `${mod.name} · Review`, cards: buildReviewQueue(MODULES, ctx, cards, Date.now(), 50, mod.id), back: `/m/${mod.id}` })}
            >
              <Icon name="review" size={18} /> Review {due}
            </button>
          )}
          {weak > 0 && (
            <button
              className="btn"
              onClick={() => startSession({ title: `${mod.name} · Weakest`, cards: buildWeakQueue(MODULES, ctx, cards, Date.now(), mod.id), back: `/m/${mod.id}` })}
            >
              <Icon name="zap" size={18} /> Weakest
            </button>
          )}
        </div>
      </div>

      {totals.reviews > 0 && (
        <div className="row small muted" style={{ marginTop: -12, marginBottom: 24, gap: 18 }}>
          <span>{totals.reviews} answers</span>
          <span>{Math.round(totals.accuracy * 100)}% correct</span>
        </div>
      )}

      {isUnverified(mod.id) && (
        <div className="notice warn" style={{ marginBottom: 20 }}>
          <b>Unverified · </b>this content was written by an earlier Claude session, not taken from your textbook. It will be checked
          against your book chapter by chapter once you send the pages.
        </div>
      )}

      {mod.banner && <mod.banner ctx={ctx} />}

      {empty ? (
        empty
      ) : (
        <>
          {groups.length > 0 && <GroupPicker mod={mod} groups={groups} selected={selected} />}

          <div className="section">
            <div className="section-head">
              <h2>Exercises</h2>
              <div className="row" style={{ gap: 6 }} role="group" aria-label="Questions per round">
                <span className="faint small">per round</span>
                {[[0, `${ctx.settings.sessionLength}`], [50, '50'], [100, '100'], [9999, 'All']].map(([n, label]) => (
                  <button key={n} className={`chip${len === n ? ' on' : ''}`} aria-pressed={len === n} onClick={() => chooseLen(n as number)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid" style={{ '--min': '280px' } as React.CSSProperties}>
              {mod.exercises.map((ex) => {
                const all = exerciseItems(ex, ctx);
                const count = filterByGroups(all, mod.groups ? selected : undefined).length;
                const why = all.length === 0 ? ex.emptyMessage?.(ctx) ?? 'no content yet' : 'nothing selected';
                return (
                  <button key={ex.id} className="card card-link ex-card" onClick={() => start(ex)} disabled={count === 0}>
                    <span className="ex-icon"><GlyphIcon glyph={ex.icon} /></span>
                    <span>
                      <h3>{ex.name}</h3>
                      <span className="muted small">{ex.description}</span>
                      <span className="ex-meta">
                        <span className="tag">{ex.generative ? `${count} categor${count === 1 ? 'y' : 'ies'}` : `${count} item${count === 1 ? '' : 's'}`}</span>
                        {count === 0 && <span className="tag tag-warn">{why}</span>}
                        {!isUnverified(mod.id) && isUnverified(mod.id, ex.id) && (
                          <span className="tag tag-warn" title="Written by an earlier Claude session, not taken from your material">
                            unverified
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {!empty && mod.chart && <Heatmap mod={mod} />}

      {mod.tools && mod.tools.length > 0 && (
        <div className="section">
          <div className="section-head">
            <h2>Tools</h2>
          </div>
          <div className="grid" style={{ '--min': '260px' } as React.CSSProperties}>
            {mod.tools.map((t) => (
              <a key={t.id} className="card card-link ex-card" href={`#/m/${mod.id}/t/${t.id}`}>
                <span className="ex-icon"><GlyphIcon glyph={t.icon} /></span>
                <span>
                  <h3>{t.name}</h3>
                  <span className="muted small">{t.description}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupPicker({ mod, groups, selected }: { mod: StudyModule; groups: FilterGroup[]; selected: string[] }) {
  const sel = new Set(selected);
  const sections = [...new Set(groups.map((g) => g.section ?? ''))];
  const toggle = (id: string) => {
    const next = new Set(sel);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelection(mod.id, [...next]);
  };
  const setAll = (ids: string[], on: boolean) => {
    const next = new Set(sel);
    ids.forEach((i) => (on ? next.add(i) : next.delete(i)));
    setSelection(mod.id, [...next]);
  };
  return (
    <div className="card card-pad">
      <div className="row" style={{ marginBottom: 14 }}>
        <h2 style={{ flex: '1 1 auto' }}>What to practise</h2>
        {mod.presets?.map((p) => {
          const on = p.groups.length === selected.length && p.groups.every((g) => sel.has(g));
          return (
            <button key={p.id} className={`chip${on ? ' on' : ''}`} onClick={() => setSelection(mod.id, p.groups)}>
              {p.label}
            </button>
          );
        })}
      </div>
      {sections.map((s) => {
        const gs = groups.filter((g) => (g.section ?? '') === s);
        const allOn = gs.every((g) => sel.has(g.id));
        return (
          <div className="picker-section" key={s}>
            {s && (
              <div className="row" style={{ marginBottom: 8 }}>
                <span className="eyebrow" style={{ margin: 0 }}>{s}</span>
                <button className="btn btn-ghost btn-sm" style={{ minHeight: 26, padding: '0 8px' }} onClick={() => setAll(gs.map((g) => g.id), !allOn)}>
                  {allOn ? 'none' : 'all'}
                </button>
              </div>
            )}
            <div className="picker-chips">
              {gs.map((g) => (
                <button key={g.id} className={`chip${sel.has(g.id) ? ' on' : ''}`} onClick={() => toggle(g.id)} aria-pressed={sel.has(g.id)}>
                  <span className="chip-ja" lang="ja">{g.label}</span>
                  {g.sub && <span className="chip-sub">{g.sub}</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <div className="faint small" style={{ marginTop: 14 }}>
        {selected.length} selected · your choice is remembered
      </div>
    </div>
  );
}

export function ToolScreen({ id, tool }: { id: string; tool: string }) {
  const ctx = useCtx();
  const mod = getModule(id);
  const t = mod?.tools?.find((x) => x.id === tool);
  if (!mod || !t) {
    navigate('/study');
    return null;
  }
  const C = t.component;
  if (mod.status === 'soon' || moduleInfo(mod.id).soon)
    return (
      <div className="page">
        <div className="empty">
          <p style={{ marginBottom: 14 }}>{mod.name} is coming later – your progress is kept until then.</p>
          <a className="btn" href={`#/m/${mod.id}`}>Back to {mod.name}</a>
        </div>
      </div>
    );
  return (
    <div className="page">
      <a href={`#/m/${mod.id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: -10, marginBottom: 14 }}>
        <Icon name="left" size={16} /> {mod.name}
      </a>
      <div className="page-head">
        <div className="grow">
          <h1>{t.name}</h1>
          <div className="muted" style={{ marginTop: 4 }}>{t.description}</div>
        </div>
      </div>
      <C ctx={ctx} />
    </div>
  );
}
