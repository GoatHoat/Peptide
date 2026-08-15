import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './lib/auth';
import { ProfileProvider } from './lib/prefs';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { SetupNeeded } from './screens/SetupNeeded';
import './styles.css';
import './onboarding.css';

/* production only — a service worker in dev just serves stale bundles.
 *
 * The registration is only half of it. Without the controllerchange reload a
 * phone that already had the app open kept running whichever build it first
 * loaded, so a deployed fix looked like it had never shipped. Checking for an
 * update every time the tab becomes visible is what makes reopening the app
 * enough to pick one up. */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        reg.update().catch(() => {});
        const check = () => document.visibilityState === 'visible' && reg.update().catch(() => {});
        document.addEventListener('visibilitychange', check);
        reg.addEventListener('updatefound', () => {
          const next = reg.installing;
          next?.addEventListener('statechange', () => {
            // a waiting worker with a controller already present means a new
            // build is ready behind the running one — take it now
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              next.postMessage('skip-waiting');
            }
          });
        });
      })
      .catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSupabaseConfigured ? (
      <AuthProvider>
        <ProfileProvider>
          <App />
        </ProfileProvider>
      </AuthProvider>
    ) : (
      <SetupNeeded />
    )}
  </StrictMode>,
);
