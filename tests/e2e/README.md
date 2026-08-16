# Smoke tests

Four tests: the app boots, onboarding completes, Today renders, Discover
renders. They exist so that "the build is green" means something more than
"the code compiles" — every one of these would have passed a `tsc` run while
showing a blank screen.

```bash
npx playwright install chromium   # once per machine
npm test
```

There is no Supabase project behind them and no keys are needed. Every request
the client makes is answered inside the page by `support/supabaseStub.ts`,
which models enough of GoTrue and PostgREST for the app's own calls and
records anything it does not recognise. A test fails if that record is not
empty, so a screen quietly reading a table nobody stubbed shows up as a
failure rather than as an empty list.

Three things are asserted after every test on top of whatever the test itself
checks: no uncaught exception, no `console.error`, and no unmodelled Supabase
call.

## If a test starts failing

- **`Timed out waiting from config.webServer`** — port 5174 is occupied, or
  Vite could not bind `127.0.0.1`. Both are in `playwright.config.ts`.
- **`Supabase calls the stub does not model`** — a screen started reading a
  new table. Add it to `support/catalogue.ts`; the stub is deliberately loud
  about this rather than returning `[]`.
- **A step in `completeOnboarding` cannot find its button** — the flow moved.
  `support/app.ts` walks it screen by screen and asserts each heading before
  acting, so the failing line names the screen that changed.
