import { useEffect, type ReactNode } from 'react';
import { useApp } from './core/store';
import { useCourse, useDueCounts } from './core/hooks';
import { useSyncStatus } from './core/sync';
import { timeAgo } from './lib/date';
import { match, usePath } from './lib/router';
import { Icon, type IconName } from './components/Icon';
import { Home } from './screens/Home';
import { Study } from './screens/Study';
import { ModuleScreen, ToolScreen } from './screens/ModuleScreen';
import { Review } from './screens/Review';
import { Stats } from './screens/Stats';
import { Focus } from './screens/Focus';
import { InboxBell } from './components/InboxBell';
import { FocusWidget } from './screens/FocusWidget';
import { Settings } from './screens/Settings';
import { SessionScreen } from './screens/Session';
import { CourseRoute, TopicPage } from './screens/Course';

const NAV: Array<{ path: string; label: string; icon: IconName }> = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/study', label: 'Study', icon: 'study' },
  { path: '/review', label: 'Review', icon: 'review' },
  { path: '/stats', label: 'Stats', icon: 'stats' },
  { path: '/focus', label: 'Focus', icon: 'clock' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

/** Subject colour for the current screen: Focus, the open subject, or none (cream) on shared screens. */
function accentFor(path: string, courseId: string): string | null {
  if (path.startsWith('/focus')) return 'focus';
  if (path === '/' || path === '/stats' || path === '/settings') return null;
  return courseId;
}

function useThemeAndFurigana(path: string) {
  const theme = useApp((s) => s.settings.theme);
  const furigana = useApp((s) => s.settings.furigana);
  const surface = useApp((s) => s.settings.surface);
  const apple = surface === 'apple';
  const courseId = useCourse().id;
  const accent = accentFor(path, courseId);
  useEffect(() => {
    const root = document.documentElement;
    if (accent) root.dataset.course = accent;
    else delete root.dataset.course;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', apple ? (dark ? '#2b2b2e' : '#f2f2f7') : dark ? '#2a1a12' : '#a86948');
  }, [theme, accent, apple]);
  useEffect(() => {
    document.documentElement.dataset.surface = surface ?? 'glass';
  }, [surface]);
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
  if (path === '/focus') return <Focus />;
  if (path === '/settings') return <Settings />;
  if ((p = match('/c/:id', path))) return <CourseRoute key={p.id} id={p.id} />;
  if ((p = match('/c/:id/t/:topic', path))) return <TopicPage key={path} courseId={p.id} topicId={p.topic} />;
  if ((p = match('/m/:id', path))) return <ModuleScreen key={p.id} id={p.id} />;
  if ((p = match('/m/:id/t/:tool', path))) return <ToolScreen key={path} id={p.id} tool={p.tool} />;
  return <Home />;
}

export function App() {
  const ready = useApp((s) => s.ready);
  const path = usePath();
  useThemeAndFurigana(path);
  if (!ready)
    return (
      <div className="state" aria-busy="true">
        <div>
          <div className="loading-bar" style={{ margin: '0 auto 14px' }} />
          Loading your subjects…
        </div>
      </div>
    );
  if (path === '/session') return <SessionScreen />;
  if (path === '/focus-widget') return <FocusWidget />;
  return <Shell path={path}>{route(path)}</Shell>;
}

function SyncLine() {
  const s = useSyncStatus();
  if (s.phase === 'off') return null;
  const text = s.phase === 'syncing' ? 'Syncing…' : s.phase === 'error' ? 'Sync problem – see Settings' : s.lastSync ? `Synced ${timeAgo(s.lastSync)}` : 'Sync on';
  return (
    <a className={`sidebar-sync sync-status-line ${s.phase}`} href="#/settings">
      <span className={`sync-dot`} aria-hidden="true" /> {text}
    </a>
  );
}

function Shell({ path, children }: { path: string; children: ReactNode }) {
  const due = useDueCounts().total;
  const syncError = useSyncStatus().phase === 'error';
  const course = useCourse();
  const active = (p: string) => (p === '/' ? path === '/' : path === p || (p === '/study' && (path.startsWith('/m/') || path.startsWith('/c/'))));
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#/">
          <span className="seal" aria-hidden="true"><Icon name="book" size={20} /></span>
          <span>
            <div className="brand-name">Study Desk</div>
            <div className="brand-sub">{path === '/' ? 'Choose a subject' : path.startsWith('/focus') ? 'Focus' : course.name}</div>
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
          <SyncLine />
          Offline · no ads · your data stays yours
        </div>
      </aside>
      <InboxBell />
      <main className="main" key={path}>
        {children}
      </main>
      <nav className="bottom-nav" aria-label="Main">
        {NAV.map((n) => (
          <a key={n.path} href={`#${n.path}`} className={active(n.path) ? 'active' : ''} aria-current={active(n.path) ? 'page' : undefined}>
            <Icon name={n.icon} size={22} />
            {n.label}
            {n.path === '/review' && due > 0 && <span className="nav-dot">{due > 99 ? '99+' : due}</span>}
            {n.path === '/settings' && syncError && <span className="nav-dot nav-alert" aria-label="Sync problem" />}
          </a>
        ))}
      </nav>
    </div>
  );
}
