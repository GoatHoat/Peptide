import { NAME } from '../lib/brand';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';

type Mode = 'signin' | 'signup';

export function Auth() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) setError(error);
      } else {
        if (!displayName.trim()) {
          setError('Enter a name.');
          return;
        }
        const { error, needsConfirmation } = await signUp(email, password, displayName.trim());
        if (error) setError(error);
        else if (needsConfirmation) setConfirmPending(true);
      }
    } finally {
      setBusy(false);
    }
  };

  if (confirmPending) {
    return (
      <div className="auth-screen">
        <div className="auth-head">
          <h1 className="t-title">Check your email</h1>
          <div className="screen-sub t-body">
            We sent a confirmation link to {email}. Follow it, then come back and sign in.
          </div>
        </div>
        <button
          className="btn btn-out pressable"
          style={{ marginTop: 24 }}
          onClick={() => {
            setConfirmPending(false);
            setMode('signin');
          }}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-head">
        <h1 className="t-title">{NAME}</h1>
        <div className="screen-sub t-body">
          {mode === 'signin' ? 'Sign in to your account' : 'Create an account to start tracking'}
        </div>
      </div>

      <form className="auth-form" onSubmit={submit}>
        {mode === 'signup' && (
          <div className="field">
            <label className="t-label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              className="field-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              placeholder="Your name"
            />
          </div>
        )}

        <div className="field">
          <label className="t-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="field-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="field">
          <label className="t-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="field-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="••••••••"
            minLength={6}
            required
          />
        </div>

        {error && <div className="auth-error t-secondary">{error}</div>}

        <button className="btn btn-fill pressable" type="submit" disabled={busy} style={{ marginTop: 8, width: '100%' }}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <button
        className="auth-switch pressable"
        onClick={() => {
          setError(null);
          setMode(mode === 'signin' ? 'signup' : 'signin');
        }}
      >
        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        <span style={{ color: 'var(--purple)' }}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</span>
      </button>
    </div>
  );
}
