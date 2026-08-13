import type { CSSProperties, ReactNode } from 'react';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Frosted glass panel. Specular top edge only — never a perimeter border.
 *
 * `level` 1  — standard panel, needs a background field behind it to distort
 * `level` 2  — a panel on a panel: sheets, the scan toast
 * `level` 'flat' — opaque `#131316`. Use when there is nothing behind the panel
 *   but flat black: `backdrop-filter` over flat black returns a constant, so it
 *   costs GPU for a colour you could have written down.
 */
export function Glass({
  children,
  className,
  style,
  radius = 22,
  level = 1,
  onClick,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  radius?: number;
  level?: 1 | 2 | 'flat';
  onClick?: () => void;
}) {
  const cls = level === 2 ? 'glass-2' : level === 'flat' ? 'surface' : 'glass';
  return (
    <div className={cx(cls, className)} style={{ borderRadius: radius, ...style }} onClick={onClick}>
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  className,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cx('btn-primary', className)} style={style} onClick={onClick}>
      {children}
    </div>
  );
}

export function SecondaryButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div className={cx('btn-secondary', className)} onClick={onClick}>
      {children}
    </div>
  );
}

export function Tertiary({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div className={cx('btn-tertiary', className)} onClick={onClick}>
      {children}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('section-label', className)}>{children}</div>;
}

export function Chevron({ color = 'rgba(255,255,255,0.38)' }: { color?: string }) {
  return (
    <svg width="7" height="12" viewBox="0 0 8 14" className="flex-none">
      <path d="M1 1l6 6-6 6" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

