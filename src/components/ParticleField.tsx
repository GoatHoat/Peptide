import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  r: number;
  a: number;
  amp: number;
  per: number;
  ph: number;
  vamp: number;
}

/**
 * Seeded once so the field is identical every run.
 *
 * These are deliberately much larger and softer than a dust field. They have to
 * survive a 24px backdrop blur: a 2px dot blurred at 24px loses ~99% of its
 * peak, which is why the cards previously computed to flat #0E0E0E no matter
 * what the glass recipe said. Blur preserves *area*, so the substrate has to be
 * made of broad soft blooms, not points.
 */
function seed(): Particle[] {
  const P: Particle[] = [];
  let s = 20260809;
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  for (let i = 0; i < 240; i++) {
    // full height, gentle bias toward the bottom — not confined to a third,
    // because cards sit everywhere and every one of them needs something behind it
    const yn = 0.04 + 0.94 * Math.pow(rnd(), 1.2);
    const size = 14 + 46 * Math.pow(rnd(), 0.8);
    P.push({
      x: rnd(),
      y: yn,
      r: size / 2,
      a: 0.1 + 0.3 * Math.min(1, (size - 14) / 46),
      amp: 12 + 16 * rnd(),
      per: 9 + 7 * rnd(),
      ph: rnd() * 6.2832,
      vamp: 2 + 3 * rnd(),
    });
  }
  return P;
}

const PARTICLES = seed();

/** One soft copper bloom, drawn once and blitted — cheap and smooth-edged. */
let sprite: HTMLCanvasElement | null = null;
function getSprite(): HTMLCanvasElement {
  if (sprite) return sprite;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(214,133,74,0.95)');
  grad.addColorStop(0.4, 'rgba(200,121,65,0.45)');
  grad.addColorStop(1, 'rgba(200,121,65,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  sprite = c;
  return c;
}

interface Props {
  density: number;
  reduceMotion: boolean;
  lowPower: boolean;
}

export function ParticleField({ density, reduceMotion, lowPower }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const opts = useRef({ density, reduceMotion, lowPower });
  opts.current = { density, reduceMotion, lowPower };

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let staticDone: number | null = null;

    const draw = (t: number) => {
      const cv = canvasRef.current;
      if (!cv) return;
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(w * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const img = getSprite();
      const n = Math.min(PARTICLES.length, Math.round(110 * opts.current.density));
      // one shared, very slow wave so it reads as a single body of dust
      const shared = Math.sin(t * 0.2618);

      for (let i = 0; i < n; i++) {
        const p = PARTICLES[i];
        const x = p.x * w + p.amp * Math.sin((t * 6.2832) / p.per + p.ph) + 14 * shared * (0.55 + 0.45 * p.y);
        const y = p.y * h + p.vamp * Math.sin((t * 6.2832) / (p.per * 1.7) + p.ph);
        const d = p.r * 4;
        ctx.globalAlpha = p.a;
        ctx.drawImage(img, x - d / 2, y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      if (opts.current.reduceMotion) {
        if (staticDone === opts.current.density) return;
        staticDone = opts.current.density;
        draw(6.4);
        return;
      }
      staticDone = null;
      const fps = opts.current.lowPower ? 12 : 60;
      if (last && now - last < 1000 / fps - 1) return;
      last = now;
      draw(now / 1000);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 0 }} />;
}

/** Full density — the gate and the streak reward. */
export const GATE_DENSITY = 1.15;
/** The main-app screens: enough substrate for every card to have something behind it. */
export const FIELD_DENSITY = GATE_DENSITY * 0.75;

export const FIELD_SCREENS = ['today', 'stack', 'item', 'analysis', 'profile'];

export function densityFor(screen: string): number {
  if (screen === 'gate') return GATE_DENSITY;
  if (FIELD_SCREENS.includes(screen)) return FIELD_DENSITY;
  return 0;
}
