# Do not stop

Append this to whatever you are working on. It overrides any instinct to pause,
check in, or hand back.

## The rule

**Work continuously until every section of `PROMPT_FINISH.md` and
`PROMPT_LEGAL.md` is complete.** I am asleep. There is nobody to answer a
question, approve a choice, or unblock you. A session that stops at 3am to ask
something has failed, however good the question was.

## When you would normally ask me something

Do not. Instead:

1. Make the most conservative choice that keeps the app shippable.
2. Do it.
3. Write one line in `DECISIONS.md` — what you chose, and why.
4. Keep going.

Conservative means: the option that is easiest to reverse, that changes the least
existing behaviour, and that cannot ship something broken or non-compliant. If two
options are equally safe, take the smaller one.

## When you are blocked

A blocked section is not a reason to stop the run. Never sit waiting.

1. Try twice.
2. If it still fails, `git reset --hard` that section's changes so the tree is
   clean.
3. Write what happened in `BLOCKED.md` — the section, the error, what you tried.
4. **Move to the next section immediately.**

Come back to blocked sections at the end if time allows. Finishing eight sections
and reporting two blocked is a good night. Finishing three and stopping to ask
about the fourth is not.

## Do not stop to summarise

No progress reports mid-run. No "here is what I have done so far, shall I
continue?" No pausing between sections for acknowledgement. Commit, and start the
next section in the same breath. The report happens once, at the end.

## Done means all of this

Not one of them. All:

- Every section of `PROMPT_FINISH.md` — 1, 2, 3, 3b, 3c, 4, 5, 6, 6b, 7
- Every section of `PROMPT_LEGAL.md` — both parts
- `npm run build && npm test` green
- Every section committed separately with a real message
- `FINISH_REPORT.md` written, covering everything the report sections of both
  prompts ask for
- `DECISIONS.md` and `BLOCKED.md` written, or explicitly noted as empty

If any of those is outstanding, you are not done and you keep working.

## The rules that still bind you, even now

These do not bend because I am asleep. They bend *less*, because nobody is
watching:

- **Never apply a migration to the remote database.** Write it, list it in the
  report, leave it. This is the one action git cannot undo.
- **Never `git push`.** Everything stays local.
- **Never flip `SKIP_PAYWALL` or touch `purchase()`.** A paywall that grants the
  tier without charging is an instant rejection.
- **Never invent a legal fact.** Country, entity, age minimum, retention period,
  contact address — placeholders only, per `PROMPT_LEGAL.md`.
- **Never write a secret**, and never commit one.
- **Never delete something you do not understand.** The two exceptions are named
  in `PROMPT_FINISH.md`; nothing else.

If a task appears to require breaking one of these, that task is blocked. Log it
and move on. Do not reason your way around it because it is the only way to
finish — finishing is not worth more than these six rules.

## Do not claim done what is not done

At the end, the report must be exact. A section that half works is half done and
must be described that way. Do not round up, do not describe intent as outcome,
and do not mark something complete because it compiles.

I would rather wake up to "six done, two half, two blocked, here is exactly
where" than to a claim of completion I have to spend the morning verifying. The
accuracy of your reports so far is the reason I am comfortable leaving this
running. Keep it.
