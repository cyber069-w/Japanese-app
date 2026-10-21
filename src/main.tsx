import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/roboto-mono';
import '@fontsource-variable/noto-sans-jp';
import '@fontsource-variable/noto-serif-jp';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/apple.css';
import { initStore } from './core/store';
import { startSync } from './core/sync';
import { loadLessonPacks } from './modules/cfa/lessonPacks';
import { App } from './App';

// offline support: the service worker caches the app and updates itself in the background
registerSW({ immediate: true });

initStore().then(() => {
  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
  // sync with your other devices in the background (only if you connected one)
  void startSync();
  // new versions of the CFA lessons that ship (encrypted) with the app
  void loadLessonPacks();
});
