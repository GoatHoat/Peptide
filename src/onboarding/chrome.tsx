import { NAME } from '../lib/brand';
import type { ReactNode } from 'react';
import { FLOW, NO_BACK, SKIPPABLE, type Step } from './flow';

export function Wordmark({ size = 17 }: { size?: number }) {
  return (
    <span className="ob-wordmark" style={{ fontSize: size }}>
      <LogoMark size={Math.round(size * 1.15)} />
      {NAME}
    </span>
  );
}

/** A capsule on its side, split — the stack, and the schedule cutting it up. */
export function LogoMark({ size = 20, color = 'var(--accent)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.6" y="7.4" width="18.8" height="9.2" rx="4.6" stroke={color} strokeWidth="1.9" />
      <path d="M12 7.4v9.2" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

/**
 * One segment per step. Filled segments are the steps behind you, so it can
 * never claim "87% complete" on step four — the denominator is the real flow
 * length and every segment is the same width.
 */
export function ProgressBar({ step }: { step: Step }) {
  const index = FLOW.indexOf(step);
  return (
    <div
      className="ob-progress"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={FLOW.length}
      aria-valuenow={index + 1}
      aria-label={`Step ${index + 1} of ${FLOW.length}`}
    >
      {FLOW.map((s, i) => (
        <span key={s} className={`ob-seg${i <= index ? ' on' : ''}`} />
      ))}
    </div>
  );
}

export function Header({
  step,
  onBack,
  onSkip,
}: {
  step: Step;
  onBack: () => void;
  onSkip: () => void;
}) {
  const canBack = !NO_BACK.has(step) && FLOW.indexOf(step) > 0;
  return (
    <header className="ob-header">
      <div className="ob-header-row">
        {canBack ? (
          <button className="ob-back" onClick={onBack} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <path
                d="M13.5 4.5 7 11l6.5 6.5"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <span className="ob-header-spacer" />
        )}

        <Wordmark />

        {SKIPPABLE.has(step) ? (
          <button className="ob-skip" onClick={onSkip}>
            Skip
          </button>
        ) : (
          <span className="ob-header-spacer" />
        )}
      </div>
      <ProgressBar step={step} />
    </header>
  );
}

/**
 * Placeholder for the line-art per screen. Renders a stroked outline shape at
 * 120px so the composition is right; swap the paths for real artwork without
 * touching any screen.
 */
export function OnboardIllustration({ name, size = 120 }: { name: string; size?: number }) {
  const shapes: Record<string, ReactNode> = {
    auth: (
      <>
        <circle cx="60" cy="45" r="19" />
        <path d="M22 100a38 32 0 0 1 76 0" />
      </>
    ),
    library: (
      <>
        <rect x="18" y="26" width="26" height="70" rx="4" />
        <rect x="50" y="26" width="26" height="70" rx="4" />
        <path d="M82 32l18 6-16 62-18-6z" />
      </>
    ),
    recs: (
      <>
        <circle cx="60" cy="60" r="38" />
        <path d="M42 62l12 12 24-26" />
      </>
    ),
    bell: (
      <>
        <path d="M60 20a24 24 0 0 1 24 24v20l8 12H28l8-12V44a24 24 0 0 1 24-24z" />
        <path d="M50 88a10 10 0 0 0 20 0" />
      </>
    ),
    done: (
      <>
        <circle cx="60" cy="60" r="40" />
        <path d="M40 61l14 14 28-30" />
      </>
    ),
  };
  return (
    <svg
      className="ob-illustration"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      stroke="var(--accent-light)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {shapes[name] ?? shapes.recs}
    </svg>
  );
}

/** The pinned bottom action. Every screen's primary button is this one. */
export function Cta({
  children,
  onClick,
  disabled,
  variant = 'fill',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'fill' | 'ghost' | 'outline';
  type?: 'button' | 'submit';
}) {
  return (
    <button className={`ob-cta ob-cta-${variant}`} onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  );
}

/** A screen: scrollable body, then the CTA block pinned above the home indicator. */
export function Screen({
  children,
  footer,
  scroll = false,
  center = false,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  center?: boolean;
}) {
  return (
    <div className="ob-screen">
      <div className={`ob-body${scroll ? ' scroll' : ''}${center ? ' center' : ''}`}>{children}</div>
      {footer && <div className="ob-footer">{footer}</div>}
    </div>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="ob-title">{children}</h1>;
}

export function Sub({ children }: { children: ReactNode }) {
  return <p className="ob-sub">{children}</p>;
}
