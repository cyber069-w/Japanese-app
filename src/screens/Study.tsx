import { useDueCounts } from '../core/hooks';
import { MODULES } from '../modules';
import { ModuleCard } from './Home';

export function Study() {
  const due = useDueCounts();
  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <h1>Study</h1>
          <div className="page-title-ja" lang="ja">勉強</div>
        </div>
      </div>
      <div className="grid module-grid" style={{ '--min': '230px' } as React.CSSProperties}>
        {MODULES.map((m) => (
          <ModuleCard key={m.id} mod={m} due={due.per[m.id] ?? 0} />
        ))}
      </div>
    </div>
  );
}
