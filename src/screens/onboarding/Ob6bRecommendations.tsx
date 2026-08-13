import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FALLBACK_RECOMMENDATIONS, GOALS, recommendationsFor } from '../../data/mock';
import { useStore } from '../../state/store';

/**
 * ob6b — Recommendations, fit variant. Ported from `reco_fit_reference.html`.
 *
 * Every card is visible at once and NOTHING on this screen scrolls, in either
 * direction. The rail version needed a swipe before a viewer saw more than one
 * recommendation, so in a short clip the payoff never appeared.
 *
 * Things that break silently if changed — see docs/GLASS_RULES.md:
 *  1. backdrop-filter dies if ANY ancestor has transform/filter/opacity<1 etc.
 *     A transform on the card is fine; a transform on a wrapper is not.
 *  2. The capsule is deliberately larger than the disc and breaks its edge, so
 *     `.fit-shot` has NO overflow:hidden and the 0.565-slicing rule does not
 *     apply here — nothing is clipping it.
 *  3. Particle phase comes from POSITION, never Math.random().
 *  4. If content grows, shrink it. Do not add overflow:auto back.
 */

/** Space under the stack for the left-out line, plus its margins. */
const OUT_RESERVE = 96;
const MAX_CARD_H = 142;

export function Ob6bRecommendations() {
  const { state, set, next } = useStore();

  const goal = GOALS[state.goalIdx]?.t ?? 'Skin & hair';
  const cardCount =
    Number.isFinite(state.recCount) && state.recCount > 0 ? Math.min(5, state.recCount) : 3;
  const forGoal = recommendationsFor(goal);
  const items = (forGoal.length ? forGoal : FALLBACK_RECOMMENDATIONS).slice(0, cardCount);

  const selected = state.recoSelected;
  const toggle = (id: string) =>
    set({
      recoSelected: selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    });
  const count = items.filter((i) => selected.includes(i.id)).length;

  /**
   * The reference pins the stack at top:200 with fixed 142px cards on a 402×874
   * viewport. Full-bleed removes that guarantee, so the stack fills whatever
   * sits between the sub and the CTA, and card height falls out of the space
   * available — capped at the reference's 142, never taller.
   */
  const stackRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [m, setM] = useState({ cardH: MAX_CARD_H, gap: 20, outTop: 686, showWhy: true });

  useLayoutEffect(() => {
    const measure = () => {
      const stack = stackRef.current;
      const cta = ctaRef.current;
      if (!stack || !cta) return;
      const stackTop = stack.offsetTop;
      const avail = cta.offsetTop - stackTop - OUT_RESERVE;
      const n = items.length;
      const gap = n <= 3 ? 20 : n === 4 ? 14 : 12;
      const cardH = Math.max(64, Math.min(MAX_CARD_H, Math.floor((avail - gap * (n - 1)) / n)));
      const stackH = n * cardH + (n - 1) * gap;
      setM({ cardH, gap, outTop: stackTop + stackH + 20, showWhy: cardH >= 118 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    const host = stackRef.current?.parentElement;
    if (host) ro.observe(host);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [items.length]);

  const disc = Math.min(110, Math.max(72, m.cardH - 32));
  const capsule = Math.round(disc * 1.127);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
      <div className="fit-bloom" />
      {/* Not decoration. Glass over pure black measures sd 0.00 — a perfectly
          invisible sheet of nothing. These washes are what every card lenses. */}
      <div className="fit-wash" />
      <FitParticles />

      <h1 className="fit-h1">
        Recommendations
        <br />
        for you
      </h1>
      <div className="fit-sub">Tap all the ones you want.</div>

      <div ref={stackRef} className="fit-stack" style={{ gap: m.gap }}>
        {items.map((it) => {
          const sel = selected.includes(it.id);
          return (
            <div
              key={it.id}
              onClick={() => toggle(it.id)}
              className={'fit-card' + (sel ? ' sel' : '')}
              style={{ height: m.cardH }}
            >
              <div className="fit-tick" data-sel={sel ? '1' : undefined}>
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 12.5 9.5 18 20 6.5"
                    stroke="#1A0E07"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="fit-shot" style={{ width: disc, height: disc }}>
                {/* --cell is set from JS on every layout pass, which is what
                    keeps the sheet responsive. Offsets must be px: percentage
                    background-position resolves against (container - image),
                    so -1200% throws the sheet off canvas entirely. */}
                <div
                  className="fit-capsule"
                  style={
                    {
                      '--cell': `${capsule}px`,
                      '--spin': it.spin,
                      '--delay': it.delay,
                      '--rot': `${it.rot}deg`,
                    } as React.CSSProperties
                  }
                />
              </div>

              <div className="fit-meta">
                <h2 dangerouslySetInnerHTML={{ __html: it.n }} />
                <div className="fit-dose">{it.doseOnly}</div>
                {m.showWhy && <div className="fit-why">{it.short}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* plain text, never a card — as a slab it read with the same weight as a
          recommendation, and it buys back ~70px of vertical space */}
      <div className="fit-out" style={{ top: m.outTop }}>
        <b>Left out: biotin, saw palmetto, keratin, silica, MSM, selenium.</b> Either you already
        get enough, or nobody has shown it works.
      </div>

      <div className="fit-scrim" />
      <div
        ref={ctaRef}
        onClick={() => count > 0 && next()}
        className="fit-cta"
        style={{ opacity: count ? 1 : 0.45, cursor: count ? 'pointer' : 'default' }}
      >
        {count ? `Create schedule · ${count}` : 'Create schedule'}
      </div>
    </div>
  );
}

/* ── background ────────────────────────────────────────────────
   Phase from POSITION so neighbours share it and the motion travels
   across the field as a swell.                                        */

function FitParticles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const cx = cv.getContext('2d');
    if (!cx) return;
    let raf = 0;
    let W = 0;
    let H = 0;
    let P: { x: number; y: number; r: number; a: number; amp: number; ph: number }[] = [];

    const seedField = () => {
      W = cv.clientWidth || 402;
      H = cv.clientHeight || 874;
      cv.width = W * 2;
      cv.height = H * 2;
      cx.setTransform(2, 0, 0, 2, 0, 0);
      let seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      P = Array.from({ length: 330 }, () => {
        const x = rnd() * W;
        const y = H * (0.06 + rnd() * 1.0);
        return {
          x,
          y,
          r: 0.5 + rnd() * 1.5,
          a: 0.34 + rnd() * 0.62,
          amp: 13 + rnd() * 11,
          ph: (x / W) * Math.PI * 1.7 + (y / H) * Math.PI * 0.55,
        };
      });
    };
    seedField();

    const draw = (t: number) => {
      cx.clearRect(0, 0, W, H);
      const wave = t / 2600;
      for (const p of P) {
        const dy = Math.sin(wave + p.ph) * p.amp;
        const dx = Math.cos(wave * 0.5 + p.ph) * p.amp * 0.34;
        const fall = Math.min(1, Math.max(0.28, (p.y / H - 0.02) / 0.72));
        const crest = 0.4 + 0.6 * Math.sin(wave + p.ph);
        const o = p.a * fall * fall * crest;
        const g = cx.createRadialGradient(p.x + dx, p.y + dy, 0, p.x + dx, p.y + dy, p.r * 2.6);
        g.addColorStop(0, `rgba(240,205,175,${o * 0.55})`);
        g.addColorStop(1, 'rgba(226,176,141,0)');
        cx.fillStyle = g;
        cx.beginPath();
        cx.arc(p.x + dx, p.y + dy, p.r * 2.6, 0, 7);
        cx.fill();
        cx.fillStyle = `rgba(243,214,188,${Math.min(1, o * 1.45)})`;
        cx.beginPath();
        cx.arc(p.x + dx, p.y + dy, p.r, 0, 7);
        cx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(seedField);
    ro.observe(cv);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}
