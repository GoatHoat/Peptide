import { useState, type FormEvent } from 'react';
import { Cta, LogoMark, Screen, Sub, Title } from '../chrome';
import { useAuth } from '../../lib/auth';

export function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <Screen footer={<Cta onClick={onNext}>Get started</Cta>}>
      <div className="ob-welcome">
        <LogoMark size={72} />
        <h1 className="ob-welcome-name">Pepstack</h1>
        {/* No health claims. This is the first thing App Review reads. */}
        <p className="ob-welcome-line">Know what to take, and when to take it.</p>
      </div>
    </Screen>
  );
}

/**
 * Account and form on one screen.
 *
 * These were two: a chooser offering Apple, Google and email, and the email
 * form behind it. Apple and Google are inert until the providers are switched
 * on in Supabase, so the chooser's only working control was "continue with
 * email" — a whole screen whose one live button meant "next". The providers
 * keep their place at the top for the day they ship; the form sits under them
 * where the chooser's third button used to point.
 */
export function Auth({
  mode,
  onDone,
  onSwitch,
}: {
  mode: 'signin' | 'signup';
  onDone: (userId: string, email: string) => void;
  onSwitch: (mode: 'signin' | 'signup') => void;
}) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** validation appears after blur, never while typing */
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [confirmSent, setConfirmSent] = useState(false);
  /** which switched-off provider was tapped, so the screen can say so */
  const [note, setNote] = useState<string | null>(null);

  const emailBad = touched.email && !/^\S+@\S+\.\S+$/.test(email);
  const passBad = touched.password && password.length < 6;
  const confirmBad = mode === 'signup' && touched.confirm && confirm !== password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true, confirm: true });
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) return;
    if (mode === 'signup' && confirm !== password) return;

    setBusy(true);
    setError(null);
    try {
      if (mode === 'signin') {
        const { error: err } = await signIn(email, password);
        if (err) setError(err);
        else onDone('', email);
      } else {
        const { error: err, needsConfirmation } = await signUp(email, password, email.split('@')[0]);
        if (err) setError(err);
        else if (needsConfirmation) setConfirmSent(true);
        else onDone('', email);
      }
    } finally {
      setBusy(false);
    }
  };

  if (confirmSent) {
    return (
      <Screen center footer={<Cta variant="outline" onClick={() => onSwitch('signin')}>Back to sign in</Cta>}>
        <Title>Check your email</Title>
        <Sub>
          We sent a confirmation link to {email}. Follow it, then come back and sign in.
        </Sub>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        <>
          <Cta type="submit" disabled={busy} onClick={() => document.getElementById('ob-auth-submit')?.click()}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Cta>
          <p className="ob-legal">
            By continuing you agree to our <a href="/terms">Terms</a> and{' '}
            <a href="/privacy">Privacy Policy</a>.
          </p>
        </>
      }
    >
      <Title>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</Title>
      <Sub>
        {mode === 'signin'
          ? 'Your schedule is waiting where you left it.'
          : 'So your schedule follows you between devices.'}
      </Sub>

      <div className="ob-auth-buttons">
        {/* Apple and Google are drawn but inert until the providers are enabled
            in Supabase. Guideline 4.8 means if Google ever ships, Apple ships
            with it — they are deliberately kept as a pair. */}
        <button className="ob-provider apple" type="button" disabled onClick={() => setNote('apple')}>
          <svg width="17" height="20" viewBox="0 0 17 20" fill="currentColor" aria-hidden>
            <path d="M14.1 10.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.9-1.4-.1-2.8.9-3.6.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.5.8 1.2 1.7 2.4 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.1.8 1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7 0 0-2.5-1-2.6-3.9zM11.9 3.6c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z" />
          </svg>
          Continue with Apple
        </button>
        <button className="ob-provider google" type="button" disabled onClick={() => setNote('google')}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.5h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.5 2.7-3.8 2.7-6.6z" />
            <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2a5.4 5.4 0 0 1-8-2.8H1v2.3A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M4.1 10.7a5.4 5.4 0 0 1 0-3.4V5H1a9 9 0 0 0 0 8l3.1-2.3z" />
            <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3L15 2.3A9 9 0 0 0 1 5l3.1 2.3A5.4 5.4 0 0 1 9 3.6z" />
          </svg>
          Continue with Google
        </button>
      </div>

      {note && (
        <p className="ob-caption" style={{ marginTop: 14 }}>
          {note === 'apple' ? 'Apple' : 'Google'} sign-in isn’t switched on yet — use email below.
        </p>
      )}

      {/* Without this the provider buttons and the fields read as one form. */}
      <div className="ob-or">
        <span>or use email</span>
      </div>

      <form className="ob-form" onSubmit={submit} noValidate>
        <div className="ob-field">
          <input
            className="ob-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            aria-invalid={!!emailBad}
          />
          {emailBad && <div className="ob-field-err">That doesn’t look like an email address.</div>}
        </div>

        <div className="ob-field">
          <input
            className="ob-input"
            type={show ? 'text' : 'password'}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            aria-invalid={!!passBad}
          />
          <button
            type="button"
            className="ob-eye"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff /> : <Eye />}
          </button>
          {passBad && <div className="ob-field-err">At least six characters.</div>}
        </div>

        {mode === 'signup' && (
          <div className="ob-field">
            <input
              className="ob-input"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
              aria-invalid={!!confirmBad}
            />
            {confirmBad && <div className="ob-field-err">The two passwords don’t match.</div>}
          </div>
        )}

        {mode === 'signin' && (
          <button type="button" className="ob-textlink left">
            Forgot password?
          </button>
        )}

        {error && <div className="ob-field-err" role="alert">{error}</div>}
        <button id="ob-auth-submit" type="submit" hidden />
      </form>

      <button
        className="ob-textlink"
        onClick={() => onSwitch(mode === 'signin' ? 'signup' : 'signin')}
        style={{ marginTop: 18 }}
      >
        {mode === 'signin' ? (
          <>
            No account yet? <b>Create one</b>
          </>
        ) : (
          <>
            Already have an account? <b>Sign in</b>
          </>
        )}
      </button>
    </Screen>
  );
}

const Eye = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <path d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10z" />
    <circle cx="10" cy="10" r="2.8" />
  </svg>
);
const EyeOff = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
    <path d="M8 5c.6-.1 1.3-.2 2-.2 5.5 0 8.5 5.2 8.5 5.2s-1 1.8-2.8 3.3M4.6 6.5C2.6 8 1.5 10 1.5 10S4.5 15.2 10 15.2c1.2 0 2.2-.2 3.2-.6" />
    <path d="M3 3l14 14" />
  </svg>
);
