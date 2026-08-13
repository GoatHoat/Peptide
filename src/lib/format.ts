/** Hour-as-float formatting, ported from the mockup's `fmt()`. */
export function fmt(h: number, short = false): string {
  const hh = ((Math.floor(h) % 24) + 24) % 24;
  const m = Math.round((h - Math.floor(h)) * 60);
  const ap = hh < 12 ? 'AM' : 'PM';
  let d = hh % 12;
  if (d === 0) d = 12;
  if (short) return d + (ap === 'AM' ? 'a' : 'p');
  return d + ':' + String(m).padStart(2, '0') + ' ' + ap;
}

/** Point on the 24-hour sleep dial. Centre 130,130. */
export function polar(h: number, r: number): [number, number] {
  const a = (h / 24) * 6.2832 - 1.5708;
  return [130 + r * Math.cos(a), 130 + r * Math.sin(a)];
}

/** SVG arc between two hours on the dial. */
export function arcPath(h1: number, h2: number, r: number): string {
  const p1 = polar(h1, r);
  const p2 = polar(h2, r);
  const d = (((h2 - h1) % 24) + 24) % 24;
  return (
    'M' +
    p1[0].toFixed(1) +
    ' ' +
    p1[1].toFixed(1) +
    ' A' +
    r +
    ' ' +
    r +
    ' 0 ' +
    (d > 12 ? 1 : 0) +
    ' 1 ' +
    p2[0].toFixed(1) +
    ' ' +
    p2[1].toFixed(1)
  );
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
