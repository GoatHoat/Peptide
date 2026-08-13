# Make it demo-ready on a real phone

The app currently renders a 402 × 874 phone mockup centred on a dark page. On
an actual phone that is a phone inside a phone. Fix that plus the handful of
things that make a web app look like a web app on camera.

---

## 1. Full-bleed on mobile

Detect a real touch device (`window.matchMedia('(pointer: coarse)').matches`
or viewport width under 640) and when true:

- **do not render `PhoneFrame`** — the app fills the viewport
- **do not render the dev toolbar** or the breadcrumb line above the frame
- the device container becomes `100vw × 100dvh` (use `dvh`, not `vh`, or iOS
  Safari's collapsing toolbar will cut off the bottom of the arc)

Keep the desktop layout exactly as it is — this is an addition, not a
replacement.

## 2. Standalone mode, so there is no browser chrome

In `index.html` `<head>`:

```html
<meta name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover,
               maximum-scale=1, user-scalable=no">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#000000">
<link rel="apple-touch-icon" href="/icon-180.png">
```

Add a minimal `manifest.webmanifest` with `display: "standalone"`,
`background_color` and `theme_color` both `#000000`, and link it.

Once added to the home screen this launches with no address bar and no
Safari toolbar — which is the single biggest difference between footage that
looks like a demo and footage that looks like an app.

## 3. Safe areas

With `viewport-fit=cover` the content runs under the notch and the home
indicator. Pad with the environment variables:

- top chrome: `padding-top: env(safe-area-inset-top)`
- the floating tab bar: `bottom: calc(12px + env(safe-area-inset-bottom))`
- the pinned arc: keep it relative to the bottom inset too, or it will sit
  under the home indicator

Then **remove the fake status bar** ("9:41" and the signal glyphs) on mobile —
the real one is right there, and having both is the most obvious tell in a
screen recording.

## 4. Kill the web-app tells

In `index.css`, scoped to the mobile case:

```css
* { -webkit-tap-highlight-color: transparent; }
body {
  overscroll-behavior: none;      /* no rubber-band past the top */
  -webkit-user-select: none;
  user-select: none;
  touch-action: manipulation;     /* no 300ms double-tap zoom delay */
}
```

Those grey flashes on every tap, the bounce when you scroll past the top, and
the selection handles appearing when you hold a label are the three things that
instantly read as "this is a website." All three are one line each.

## 5. Check on the device

- no scroll bounce at the top of Today
- no blue/grey flash when tapping a dose row
- the arc is not clipped by the home indicator
- nothing is hidden under the notch
- landscape is either locked out or does not break the layout
