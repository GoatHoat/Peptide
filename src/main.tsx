import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './lib/auth';
import { ProfileProvider } from './lib/prefs';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { SetupNeeded } from './screens/SetupNeeded';
import './styles.css';

// production only — a service worker in dev just serves stale bundles
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
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
