/**
 * Icons are drawn in a viewBox that matches their render size, so every stroke
 * width below is the literal px it paints at. No scaling surprises.
 */

interface IconProps {
  size?: number;
  color?: string;
}

/**
 * BUILD.md 2d — the ring-plus-hand read as an ⓘ at 17px because the hand was
 * hairline and full-length. Ring stays 1.6, the hand is 2.2 wide and only 4
 * long from the centre. It points to six o'clock, which is the half past.
 */
export function IconToday({ size = 20, color = 'currentColor' }: IconProps) {
  const c = size / 2;
  const r = size / 2 - 1.6;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={c} cy={c} r={r} stroke={color} strokeWidth={1.6} />
      <line x1={c} y1={c} x2={c} y2={c + 4} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  );
}

export function IconDiscover({ size = 20, color = 'currentColor' }: IconProps) {
  const p = 2.4;
  const w = size - p * 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <g stroke={color} strokeWidth={1.9} strokeLinecap="round">
        <line x1={p} y1={size / 2 - 4.4} x2={p + w} y2={size / 2 - 4.4} />
        <line x1={p} y1={size / 2} x2={p + w * 0.62} y2={size / 2} />
        <line x1={p} y1={size / 2 + 4.4} x2={p + w * 0.34} y2={size / 2 + 4.4} />
      </g>
    </svg>
  );
}

export function IconYou({ size = 20, color = 'currentColor' }: IconProps) {
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={c} cy={size * 0.36} r={size * 0.17} stroke={color} strokeWidth={1.6} />
      <path
        d={`M${c - size * 0.28} ${size - 2.6} a ${size * 0.28} ${size * 0.24} 0 0 1 ${size * 0.56} 0`}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconSearch({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={size * 0.42} cy={size * 0.42} r={size * 0.31} stroke={color} strokeWidth={1.7} />
      <line
        x1={size * 0.66}
        y1={size * 0.66}
        x2={size - 1.6}
        y2={size - 1.6}
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMenu({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <g stroke={color} strokeWidth={1.8} strokeLinecap="round">
        <line x1={2} y1={size * 0.32} x2={size - 2} y2={size * 0.32} />
        <line x1={2} y1={size * 0.68} x2={size - 2} y2={size * 0.68} />
      </g>
    </svg>
  );
}

export function IconDoc({ size = 34, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
}

export function IconClock({ size = 15, color = 'currentColor' }: IconProps) {
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={c} cy={c} r={c - 0.9} stroke={color} strokeWidth={1.4} />
      <path d={`M${c} ${c * 0.55}V${c}l${c * 0.5} ${c * 0.3}`} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

export function IconChat({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPerson({ size = 12, color = 'currentColor' }: IconProps) {
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={c} cy={size * 0.33} r={size * 0.19} stroke={color} strokeWidth={1.2} />
      <path
        d={`M${c - size * 0.3} ${size - 1.4} a ${size * 0.3} ${size * 0.26} 0 0 1 ${size * 0.6} 0`}
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconChevron({ size = 12, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2.5 4.5 6 8l3.5-3.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
