# Legal

## Why the initial version didn't work

The original glossary concept included specific dosing information (exact mg amounts, frequency, cycle duration — e.g., "250mcg BID for 8 weeks") and administration protocols (reconstitution ratios, injection technique, injection site specifics) presented as lookup-able reference data tied to each peptide entry. The problem wasn't the framing or presentation layer — it was tested across several variations (personal-use framing, disclaimers, direct study quotes, even routing through an in-app browser to external content) and all of them preserved the same core function: the app was selecting, organizing, and serving specific actionable protocols for unapproved substances. Changing how that data was displayed or worded didn't change what the app was functionally doing, which is what actually gets evaluated (both by app store review and in terms of product liability exposure). Any version where the app itself is the source of "how much / how often / how to administer" data hits the same wall, regardless of UI pattern.

## The fix — what changed structurally

The revised version removes the app as the source of dosing and administration specifics entirely, and repositions it as two cleanly separated layers:

**Glossary (informational, categorical only)** — each peptide entry covers: what it is, its mechanism/category (healing, growth, cosmetic, cognitive, etc.), general storage requirements (e.g., refrigerate, protect from light), route of administration type only (injected/oral/topical — no specifics), and general research trends phrased at the pattern level ("commonly studied for tissue repair") rather than as specific study protocols.

**Tracker (user-input only)** — a blank logging structure where the user enters their own dosage, schedule, and notes. The app never populates or suggests these values; it only stores and displays back what the user typed in. Functionally identical to a food diary or symptom tracker — the app has no opinion on what the "correct" numbers are.

What the glossary is limited to:

- What a peptide is, its mechanism/category (healing, growth, cosmetic, cognitive)
- General storage requirements (refrigerate, protect from light)
- That it's typically injected vs. oral vs. topical, without specifics
- General research trends ("commonly studied for X")
- User's own self-logged data (their own numbers, not the app's)

## Why this fix works

The dividing line is who originates the specific, actionable number. In the original version, the app did. In the fixed version, the app only handles general/categorical information (which doesn't constitute a usable protocol on its own) and passively stores user-generated data (which the user already had before opening the app). This keeps the product spec intact — glossary + tracker — while removing the single feature (app-sourced dosing/protocol data) that caused every prior workaround to fail.
