# Paste this into CLAUDE.md at the repo root

`CLAUDE.md` is the only instruction that survives auto-compaction — the project
root file is re-read from disk and re-injected every time the context is
compacted. Anything you say once in a prompt is gone by hour two. Rules that
must hold all night go here and nowhere else.

Keep the whole file under ~200 lines or it starts costing real context on every
turn.

---

```markdown
## Overnight autonomous runs

When working from NIGHT_QUEUE.md, these override everything else.

### The hard rules

1. **No new features.** Nothing that adds a screen, a tab, a setting, a data
   model or a user-visible capability that does not exist today. The job is to
   finish and smooth what is already here. If you believe something needs to be
   added, write it under "Proposals" in NIGHT_QUEUE.md and move on.

2. **Every run ends green.** `npm run build && npx tsc --noEmit && npm test
   --if-present` must pass before you commit. If you cannot get it green,
   `git reset --hard` back to where you started and say so. A reverted iteration
   is a fine outcome; a broken main branch discovered at 8am is not.

3. **One queue item per run.** Finish it completely, tick it off with a one-line
   note, commit, stop. Do not start the next one.

4. **Commit every iteration.** Small commits with real messages. Never `push`.
   Never touch `main`. Never force-push, rebase, or amend anything you did not
   create this session.

5. **Never write a secret.** No API keys, no service_role key, no tokens — not
   in code, not in `.env`, not in a comment, not in a test fixture, not in a log.
   Keys are read from the environment at runtime and are absent by design.
   `VITE_`-prefixed variables are inlined into the client bundle at build time
   and are public; nothing sensitive may ever carry that prefix.

6. **No new dependencies** without writing the reason in the commit message. If
   a package would take more than 50KB into the bundle, propose it instead.

7. **Do not delete or rewrite anything you do not understand.** If a file looks
   dead, say so in the report. Do not remove it.

### What "premium" means here, concretely

Do not add gradients, glows, shadows, particles or animation flourishes. This
app reads expensive through restraint, not decoration. Premium here is:

- Nothing ever appears without a loading state at its final dimensions.
- Nothing ever shifts layout after it appears.
- One easing curve and one duration set, used everywhere.
- One type scale, one spacing scale, one radius. No outliers.
- Empty states that say something useful, never a blank screen.
- Copy that is short, plain, and lowercase-after-the-first-word.
- Pure black background. One accent, `#7B5CFA`. Hairlines at
  `rgba(255,255,255,0.09)`. No second accent colour, ever.

If a change cannot be justified in one sentence as removing a seam, it is
decoration. Do not make it.

### Positioning

The app is a supplement timing and scheduling app. Peptides are a reference
library only — no doses, no recommendations, no ranking, no injection-related
UI or questions anywhere. The interaction/overdose audit is a minor side
feature and must not be given more prominence than it has.

### Reporting

Append to NIGHT_REPORT.md every iteration:
- what you changed, in one line
- what you found and did not change, and why
- anything that looked broken but was out of scope

Be blunt in this file. Things you flagged and did not fix are more useful to me
in the morning than a list of things that went fine.
```

---

## The other half: what to do before you start it

1. **Commit or stash everything.** The loop branches from `HEAD`; uncommitted
   work from your friend's pull is still sitting in the tree.

2. **Make the gate real.** The loop is only as good as `npm test`. If there are
   no tests, the gate is just "it compiles", which will not catch a screen that
   renders blank. Spend the first run writing a handful of smoke tests — the app
   boots, onboarding completes, Today renders, Discover renders — and use that as
   the gate for everything after.

3. **Check `/usage` first.** This is the thing most likely to end the night
   early. A loop like this burns through a session limit quickly, and on Pro you
   wait for the reset. `CLAUDE_CODE_RETRY_WATCHDOG=1` is already set in the
   script and handles transient 429s, but it cannot manufacture quota.

4. **Run it in a worktree if you want your main checkout untouched:**

   ```bash
   git worktree add ../pill-night HEAD
   cd ../pill-night
   bash nightly.sh
   ```

   In the morning, review the branch and cherry-pick. Nothing lands in your
   working copy without you looking at it.

5. **Stopping it:** `touch STOP` in the repo root, or Ctrl+C. The `STOP` file is
   checked at the top of every iteration, so it finishes the current item
   cleanly rather than dying mid-edit.
