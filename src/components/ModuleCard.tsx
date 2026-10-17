import { useModuleProgress } from '../core/hooks';
import { ModuleGlyph } from './GlyphIcon';
import type { StudyModule } from '../core/types';
import type { Placeholder } from '../courses/types';
import { moduleInfo } from '../courses';

export function ModuleCard({ mod, due }: { mod: StudyModule; due: number }) {
  const progress = useModuleProgress(mod);
  const info = moduleInfo(mod.id);
  const soon = mod.status === 'soon' || info.soon;
  const pct = progress.total ? progress.learned / progress.total : 0;
  const body = (
    <>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="module-glyph"><ModuleGlyph mod={mod} /></div>
        <span className="spacer" />
        {soon ? <span className="tag">coming later</span> : due > 0 ? <span className="tag tag-accent">{due} due</span> : null}
      </div>
      <div>
        <h3>{mod.name}</h3>
        <div className="faint small serif" lang="ja">{mod.nameJa}</div>
      </div>
      <div className="meta">
        {soon ? (
          <span>Your progress is kept for when it returns.</span>
        ) : progress.total > 0 ? (
          <>
            <div className="bar" style={{ flex: 1 }}>
              <span style={{ width: `${pct * 100}%` }} />
            </div>
            <span className="nowrap">
              {progress.learned}/{progress.total}
            </span>
          </>
        ) : (
          <span>{mod.description}</span>
        )}
        {!soon && info.unverified === true && <span className="tag tag-warn">unverified</span>}
      </div>
    </>
  );
  return soon ? (
    <div className="card module-card soon" aria-disabled="true">
      {body}
    </div>
  ) : (
    <a className="card card-link module-card" href={`#/m/${mod.id}`}>
      {body}
    </a>
  );
}

/** Something planned for a course that has no content yet. */
export function PlaceholderCard({ p }: { p: Placeholder }) {
  return (
    <div className="card module-card soon" aria-disabled="true">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="module-glyph" lang="ja">{p.icon ?? '…'}</div>
        <span className="spacer" />
        <span className="tag">coming later</span>
      </div>
      <h3>{p.name}</h3>
      <div className="meta">
        <span>{p.description}</span>
      </div>
    </div>
  );
}
