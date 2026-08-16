import { useState, type FormEvent } from 'react';
import { Cta, LogoMark, Screen, Sub, Title } from '../chrome';
import { useAuth } from '../../lib/auth';
import { externalLink, PRIVACY_URL, TERMS_URL } from '../../lib/legal';

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
 * Email is the only way in, deliberately. This was once a chooser offering
 * Apple, Google and email, with the form behind it — but neither provider was
 * ever switched on in Supabase, so both buttons sat permanently disabled and
 * the chooser's one live control meant "next". A control that cannot be used is
 * App Store Review Guideline 2.1, and it is the first thing a reviewer taps.
 *
 * There is a second reason not to bring them back casually. Guideline 4.8 means
 * that if Google sign-in ever ships, Sign in with Apple ships with it — they are
 * a pair, not two independent features. Email-only avoids that entirely.
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
  const { signIn, signUp, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** validation appears after blur, never while typing */
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [confirmSent, setConfirmSent] = useState(false);
  /** what the reset link request came back with, shown under the field */
  const [resetNote, setResetNote] = useState<string | null>(null);

  const emailBad = touched.email && !/^\S+@\S+\.\S+$/.test(email);
  const passBad = touched.password && password.length < 6;
  const confirmBad = mode === 'signup' && touched.confirm && confirm !== password;

  /* Always reports success, whether or not the address has an account. Saying
     "no account for that email" turns the sign-in screen into a way to test
     whether somebody uses the app. */
  const sendReset = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setTouched((t) => ({ ...t, email: true }));
      setResetNote('Enter your email address above first.');
      return;
    }
    setBusy(true);
    setResetNote(null);
    try {
      await resetPassword(email);
      setResetNote(`If there is an account for ${email}, a reset link is on its way.`);
    } finally {
      setBusy(false);
    }
  };

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
            By continuing you agree to our{' '}
            <a href={TERMS_URL} {...externalLink}>Terms</a> and{' '}
            <a href={PRIVACY_URL} {...externalLink}>Privacy Policy</a>.
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
          <button type="button" className="ob-textlink left" onClick={sendReset} disabled={busy}>
            Forgot password?
          </button>
        )}
        {resetNote && <div className="ob-caption" style={{ marginTop: 10 }}>{resetNote}</div>}

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
