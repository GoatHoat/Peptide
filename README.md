# Stack — supplement audit (web)

Front-end-only React port of the iOS prototype in `mockup/Stack Tracker.dc.html`.
No backend, no auth, no database. Every number, name and date is mock data and
lives in one file: [`src/data/mock.ts`](src/data/mock.ts).

```bash
npm install
npm run dev
```

Opens on <http://localhost:5173>. The app renders inside a 402×874 iPhone frame
centred on a dark page; the left rail is a dev toolbar — click any screen to jump
straight to it, and use the toggles to force Reduce Motion, Low Power, the empty
stack, a scan failure, or hide the alerts card.

`npm run build` · `npm run typecheck` · `npm run preview`

## Layout

```
src/
  data/mock.ts        all mock data, lifted verbatim from the mockup
  state/store.tsx     app state + screen router (localStorage-backed)
  lib/                time formatting, dial geometry, pointer-drag helper
  components/         phone frame, particle field, tab bar, add sheet, glass/buttons
  screens/            one file per screen (onboarding/ holds ob1–ob12)
```

Design source of truth, in order: `mockup/Stack Tracker.dc.html` →
`docs/DESIGN.md` → `docs/PRODUCT.md`.

## Deliberately not built

Per the build brief. Both exist as clearly-marked placeholder components and are
**not rendered anywhere**:

- `src/components/CapsuleAnimation.tsx` — the rotating capsule. Frames are in
  `capsule/`; their placement has not been decided.
- `src/components/ParticleReward.tsx` — the 7-day streak reward.
  `ParticleReward.swift` at the repo root is the iOS reference.
