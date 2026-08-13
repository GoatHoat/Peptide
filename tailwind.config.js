/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // DESIGN_V2 §1 — opaque elevation. There is no hairline token any more:
        // separation comes from background value first, whitespace second.
        canvas: '#000000',
        s1: '#131316',
        s2: '#1E1E22',
        separator: '#38383A',
        copper: {
          DEFAULT: '#C87941',
          light: '#E8A87C',
          deep: '#8A4E24',
          sheen: 'rgba(200,121,65,0.10)',
          glow: 'rgba(200,121,65,0.14)',
          dim: 'rgba(200,121,65,0.35)',
        },
        // Over-limit inversion
        invert: '#F2E9E1',
        invertInk: '#0A0A0A',
        crit: '#FF453A',
        // Text
        t1: '#FFFFFF',
        t2: 'rgba(255,255,255,0.62)',
        t3: 'rgba(255,255,255,0.38)',
        t4: 'rgba(255,255,255,0.22)',
      },
      fontFamily: {
        sans: ['-apple-system', '"SF Pro Text"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Gasoek One"', '-apple-system', 'system-ui', 'sans-serif'],
        serif: ['Marcellus', 'Georgia', 'serif'],
      },
      borderRadius: {
        card: '22px',
        tile: '18px',
        chip: '14px',
        sheet: '28px',
      },
      backgroundImage: {
        copperGradient: 'linear-gradient(135deg,#E8A87C,#C87941 55%,#8A4E24)',
      },
      keyframes: {
        glowA: {
          '0%': { transform: 'translate(-50%,0) scale(1)' },
          '50%': { transform: 'translate(-42%,-26px) scale(1.16)' },
          '100%': { transform: 'translate(-50%,0) scale(1)' },
        },
        glowB: {
          '0%': { transform: 'translate(-50%,0) scale(1.05)' },
          '50%': { transform: 'translate(-58%,22px) scale(0.92)' },
          '100%': { transform: 'translate(-50%,0) scale(1.05)' },
        },
        glowC: { '0%': { opacity: '.5' }, '50%': { opacity: '.9' }, '100%': { opacity: '.5' } },
        riseIn: { from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
    },
  },
  plugins: [],
};
