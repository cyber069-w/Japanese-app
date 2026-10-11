import { useEffect, type ReactNode } from 'react';
import { useApp } from './core/store';
import { useDueCounts } from './core/hooks';
import { match, usePath } from './lib/router';
import { Icon, type IconName } from './components/Icon';
import { Home } from './screens/Home';
import { Study } from './screens/Study';
import { ModuleScreen, ToolScreen } from './screens/ModuleScreen';
import { Review } from './screens/Review';
import { Stats } from './screens/Stats';
import { Settings } from './screens/Settings';
import { SessionScreen } from './screens/Session';

const NAV: Array<{ path: string; label: string; icon: IconName }> = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/study', label: 'Study', icon: 'study' },
  { path: '/review', label: 'Review', icon: 'review' },
  { path: '/stats', label: 'Stats', icon: 'stats' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

function useThemeAndFurigana() {
  const theme = useApp((s) => s.settings.theme);
  const furigana = useApp((s) => s.settings.furigana);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121418' : '#f6f1e7');
  }, [theme]);
  useEffect(() => {
    document.body.classList.toggle('no-furigana', !furigana);
  }, [furigana]);
}

function route(path: string): ReactNode {
  let p: Record<string, string> | null;
  if (path === '/') return <Home />;
  if (path === '/study') return <Study />;
  if (path === '/review') return <Review />;
  if (path === '/stats') return <Stats />;
  if (path === '/settings') return <Settings />;
  if ((p = match('/m/:id', path))) return <ModuleScreen key={p.id} id={p.id} />;
  if ((p = match('/m/:id/t/:tool', path))) return <ToolScreen key={path} id={p.id} tool={p.tool} />;
  return <Home />;
}

export function App() {
  const ready = useApp((s) => s.ready);
  const path = usePath();
  useThemeAndFurigana();
  if (!ready) return null;
  if (path === '/session') return <SessionScreen />;
  return <Shell path={path}>{route(path)}</Shell>;
}

function Shell({ path, children }: { path: string; children: ReactNode }) {
  const due = useDueCounts().total;
  const active = (p: string) => (p === '/' ? path === '/' : path === p || (p === '/study' && path.startsWith('/m/')));
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#/">
          <span className="seal" lang="ja">日</span>
          <span>
            <div className="brand-name">Nihongo</div>
            <div className="brand-sub" lang="ja">にほんご</div>
          </span>
        </a>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <a key={n.path} href={`#${n.path}`} className={`nav-item${active(n.path) ? ' active' : ''}`} aria-current={active(n.path) ? 'page' : undefined}>
              <Icon name={n.icon} />
              {n.label}
              {n.path === '/review' && due > 0 && <span className="nav-badge">{due}</span>}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          Offline · no ads · your data stays on this device
        </div>
      </aside>
      <main className="main" key={path}>
        {children}
      </main>
      <nav className="bottom-nav" aria-label="Main">
        {NAV.map((n) => (
          <a key={n.path} href={`#${n.path}`} className={active(n.path) ? 'active' : ''} aria-current={active(n.path) ? 'page' : undefined}>
            <Icon name={n.icon} size={22} />
            {n.label}
            {n.path === '/review' && due > 0 && <span className="nav-dot">{due > 99 ? '99+' : due}</span>}
          </a>
        ))}
      </nav>
    </div>
  );
}
