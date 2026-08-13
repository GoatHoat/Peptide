# Apps for 15–25 Year Olds — Self-Diagnosed Flaws

Same five gates as before: 5+ competitors at 200+ ratings, no 20x dominator,
buildable solo with code and API keys, demand proven by named reviewers or
counted Reddit usernames, one specific gap.

Extra filter for this round: the flaw has to be one they **already say about
themselves**, unprompted. That's why screen-time apps sell — nobody needs
convincing they have the problem.

Ratings pulled from Apple's lookup API on 2026-08-08. Reddit counts are distinct
usernames actually read, deduplicated.

---

## 1. A quit-vaping app that isn't a cigarette app wearing a costume

**Best of the set.** Two products here, and the second one is the wedge you'd
ship first.

### The structural finding

The three biggest quit-nicotine apps — Smoke Free (57,241), Days Since (18,783),
QuitNow! (13,539) — all say "cigarette" in their App Store description and **none
of them says vape, pouch, Zyn or snus.** Meanwhile nicotine pouch use among young
people [nearly quadrupled between 2022 and 2025](https://www.cdcfoundation.org/blog/Nicotine-Pouch-Use-Surges-Among-Young-People), with Zyn at 84.3% of past-month pouch users.

The tooling and the users are a generation apart. That's the whole opportunity.

### Competitors

I Am Sober 184,184 · Smoke Free 57,241 · Days Since 18,783 · QuitNow! 13,539 ·
Quit Smoking (Ebbinghaus) 11,426 · **Quit Vaping 11,575** · **Puff Count 2,566** ·
Escape the Vape 1,863 · QuitSure 1,529 · Alive 641 · Sum Puff 516 · NoPuff 495 ·
Pouch Buddy 404 · JAX 288 · VapeFree 268 · Exhale 216.

Within the vape/pouch-native set: 11,575 vs 2,566 = **4.5x**. Passes easily.

**Killed: a Zyn-only app.** Only one pouch-specific app clears 200 ratings
(Pouch Buddy, 404). Everything else is under 60. Pouches are a *unit type* inside
a nicotine app, not a product on their own — not yet.

### Product A — "Tally": log a puff without opening the app

Lock Screen widget, Home Screen widget, Watch complication, Action Button,
Shortcuts action. One tap logs it, in class or at work or in a bathroom stall.

**The gap:** vaping and pouches are 30–80 discrete events a day, not 20
cigarettes. No vape app above 1,500 ratings lets you log one without unlocking
the phone and opening the app. "Widget" appears in only two of nine vape-native
app descriptions, both under 500 ratings. None mentions Live Activities.

**Evidence — 7 named reviewers.** The best one is a user who built your product
himself out of two other apps:
- JustinJJHamm (Quit Vaping, 5★): "I paired this app with a free tally counter for Apple Watch called 'Clicker - Count Anything' and tapped the watch screen every puff I took. So I used the number from that app to log into the graph everyday for 8 months and it was perfect!"
- Skellum35 (Quit Vaping, 5★), review titled *"Widget Please!!!!"*: "Please please add a widget (Apple) so I can click break my streak without having to open the app everytime!"
- Nolawzy (Puff Count, 1★): "You have to open the app and tap a tiny little button every-time u take a puff… I can't see anyone trying to tap the button Every-time they hit there vape when there busy"
- LindsyAK (Escape the Vape, 5★): "I do wish they had a widget though!!! (Get on this guys!)"

**Reddit:** [r/QuitVaping "Secret bathroom vaping club"](https://old.reddit.com/r/QuitVaping/comments/1hgfhe3/secret_bathroom_vaping_club/) — 117 comments, **70 distinct usernames.** OP: "Secretly vaping in bathrooms all the time… so ashamed of their habit that they feel like they have to hide it from everyone." Nobody in that situation is unlocking a phone and navigating a tracker.

**Build:** SwiftUI + WidgetKit interactive widgets, ActivityKit, a watchOS target,
App Intents, App Group + SwiftData. One person, weeks not months. No server.
**Hardest part:** write correctness across processes — widget, watch, Shortcuts
and app can all fire at once against the same store. Needs an append-only event
log with client-generated UUIDs and idempotent merge, not a mutable counter. Get
this wrong and you double-count, which destroys the only thing the app does.

### Product B — "Step Down": a taper that lets you edit yesterday

You set a daily allowance that shrinks on a schedule you control. Unlike every
incumbent, you can back-fill a missed day, re-baseline mid-quit, and log a slip
without your progress going to zero.

**The gap:** every quit app with 200+ ratings is built around one irreversible
cold-turkey timestamp.

**Evidence — 11 named reviewers across 6 apps.**
- Brock461 (Smoke Free, 4★): "I wish there was other nicotine options to choose from rather than just cigarettes… non tobacco/nicotine pouches, vapes/e-cigs, tobacco pouches"
- BethanyR88 (Smoke Free, 5★): "It is designed for cigarette smoking but you can easily add vapes if you need to. Just have to do a little math." — a user doing arithmetic by hand to make a cigarette app fit
- Sarah3232323232323232323 (Smoke Free, 2★): "This is only designed if you plan to quit cold turkey, despite the description… There is no guidance to help wean you off."
- RoseKnows2002 (Escape the Vape, 2★), titled *"Don't restart the streak"*: "Allow me to slip, make mistakes but DO NOT make me start from 0!… Instead COUNT my slips."
- strawberrytonic (QuitNow!, 3★): "if you relapse why is there no option to reset the quit date? do i have to delete the app and redownload it everytime i relapse?"
- Mr. Triangles (Puff Count, 3★): "ability to add puffs on previous days OR ability to periodically adjust the quit plan… I tried uninstalling and reinstalling to reset the quit plan and this did not work, so all I did was lose my tracking progress."

**Reddit:** [r/QuittingZyn, "2-Years Clean. Here's my one simple rule."](https://old.reddit.com/r/QuittingZyn/comments/1jrf453/2years_clean_howd_i_do_it_heres_my_one_simple_rule/) — 164 comments, **65 distinct usernames**, the whole thread arguing about all-or-nothing framing.

### Staying on the right side of the line

This is behaviour change, not treatment, and it stays that way only if you
enforce it:

- **The user sets the target and the slope.** The app never recommends a nicotine
  level, a step size, or a quit date. It's arithmetic on numbers they declared —
  a budget they set, like a screen-time limit.
- **No nicotine-replacement suggestions.** Logging a lozenge someone already uses
  is fine. Recommending one is not.
- **No health-outcome meters.** No "lungs 47% healed." That's a clinical claim
  with no per-user basis.
- **No withdrawal-symptom interpretation, no dependence scoring, no diagnosis.**
  Money saved, units logged, calendar. That's it.
- Ship as Health & Fitness, 17+, no medical-device framing.

I killed a "is this withdrawal normal?" symptom companion outright despite huge
Reddit demand (r/QuittingZyn's top threads are symptom questions at 315, 274 and
120 comments) — it can only work by telling people what their symptoms mean,
which is exactly the thing you shouldn't build.

### Strongest argument against

Puff Count already sits in Product B's position with only 2,566 ratings and a
4.34 average — the weakest in the set. Either they executed badly and the demand
is unserved, or taper-tracking is inherently high-friction and most people who
succeed go cold turkey. And the category leader, Quit Vaping, is **free** at
11,575 ratings and 4.89.

---

## 2. "Roll Call" — an alarm whose enforcement is a person

**One line:** A hard alarm that requires a physical dismissal mission *and*
reports to a 3–5 person group the same morning whether you actually got up. Core
alarm free.

**The gap:** every hard-alarm app enforces with in-app friction the user can
defeat alone by deleting the app — and the two fastest-growing entrants hard-gate
the alarm behind a subscription this demographic says outright it won't pay.

**Competitors:** Alarmy 242,097 · Alarm Clock for Me 123,715 · Alarm Clock HD
103,831 · Loud Alarm Clock 39,026 · Alarm Clock Wake up Music 35,633 · Wayk
18,252 · Erly 15,646 · One Touch 10,608 · Kiwake 1,011 · CARROT 672 · Instant
Wake Up 489 · SnoozeProof 385 · SpinMe 339. Thirteen apps over 200; leader is
**1.96x** the runner-up.

**Important:** the *social alarm* sub-genre is an empty shelf — PingPal, UpCast,
Wake, Alarm Friend and Snooze Squad all have 0–1 ratings. The category demand is
proven; the social mechanism is unvalidated. That's the bet.

**Evidence — defeat by deletion, named Alarmy reviewers:**
- rishi peri (5★, "Great and free"): "I just delete the app every morning and go back to sleeping"
- SkxttleVxbes (4★): "its good but to be honest i deleted the app and went back to sleep for another 6 hours"
- xosq666 (5★) — review literally titled *"works too well i deleted it"*

**Reddit:** [r/getdisciplined, "24 y/o and CANNOT wake up early to save my life (it's embarrassing)"](https://old.reddit.com/r/getdisciplined/comments/1t126ng/24_yo_and_cannot_wake_up_early_to_save_my_life/) — 104 comments, **84 distinct usernames.** And [r/GetOutOfBed, "I ACTUALLY can't wake up to my alarms"](https://old.reddit.com/r/GetOutOfBed/comments/82zpow/i_actually_cant_wake_up_to_my_alarms/) — 181 comments, **98 distinct usernames.** Note the OP's word: *embarrassing*. That's self-diagnosis.

**Build:** local + push notifications, background audio session, Vision for
photo/QR missions, small backend for the group. **Hardest part:** making an alarm
fire reliably and loudly on iOS when the app isn't running. That's the entire moat
of this category. It needs either Apple's Critical Alerts entitlement (manually
approved, frequently declined for non-safety apps) or the fragile
silent-background-audio technique Alarmy uses.

**Against it:** Alarmy has 242,097 ratings and a decade of iteration on exactly
this, and social shame does not physically stop someone deleting your app at 7am.
Free removes your revenue while servers, APNs and a social graph all cost money.
And a social alarm needs your friends to install it too — cold start on a product
used at 7am.

**Medical line:** stay on punctuality. No insomnia treatment, no sleep staging, no
apnea detection, no "cures oversleeping." Note that r/GetOutOfBed drifts heavily
into real sleep-disorder territory — don't follow users there.

---

## 3. "Delivery Shield" — friction on the apps where money leaves

**One line:** A Screen Time shield on DoorDash/Uber Eats/Grubhub whose pause
screen shows what you've already spent on delivery this month, and what that
equals in hours at your wage.

**The gap:** six screen-time blockers with 2,000–85,000 ratings all add friction
to *attention*. Not one adds friction to the apps through which money physically
leaves.

**Competitors:** Opal 85,505 · BePresent 60,818 · ScreenZen 46,869 · one sec
23,329 · ClearSpace 8,768 · Jomo 2,283. Leader is **1.41x** the runner-up.

**Evidence — Reddit only, and strong.** [r/personalfinance, "How to block spending of my money due to extremely bad self control and impulsivity?"](https://old.reddit.com/r/personalfinance/comments/wdim9i/how_to_block_spending_of_my_money_due_to/) — 306 comments, **130 distinct usernames.** The OP:

> "Have very bad impulsivity and self control mainly when it comes to ordering delivery food. How do I put barriers in place between me and my savings so that I don't spend it."

Top comment, 977 points, u/erinburrell: *"I found that setting a small obstacle could help me rethink before I made a purchase."* That's your product spec, written by a user, upvoted 977 times.

Two more: ["Stopped ordering food delivery to save $$"](https://old.reddit.com/r/personalfinance/comments/aaba5z/stopped_ordering_food_delivery_to_save/) — 430 comments, **161 distinct usernames**, OP is "in my 20s." And ["Impulse spending and ADHD"](https://old.reddit.com/r/personalfinance/comments/uupl75/impulse_spending_and_adhd/) — 406 comments, **114 distinct usernames**. Plus u/Kazoky in r/povertyfinance: *"My 'occasional' food delivery was actually averaging $430/month."*

**No named App Store reviewers on this gap.** 1,100 reviews scanned across
Spending Tracker, Buddy, ScreenZen and Opal turned up zero. This passes on the
Reddit limb only.

**Build:** FamilyControls + ManagedSettings + DeviceActivity. No bank connection,
no licence, no funds held. **Two hard constraints:** the Family Controls
entitlement is a manual Apple approval that gates release entirely, and the
shield screen is a separate sandboxed process with no network and almost no UI —
icon, title, subtitle, two buttons. The dollar figure has to be computed in the
main app and written to a shared App Group container.

**Against it:** where does the dollar number come from? Without a bank connection
the user self-reports — and anyone diligent enough to self-report probably
doesn't have the problem. There's a real risk it degrades into a generic blocker,
at which point six incumbents do it better and ScreenZen is free.

---

## ALSO VIABLE, RANKED LOWER

**"Thaw" — reopening threads you let go cold.** Tracks which friendships have
gone quiet and drafts the actual first message so you don't have to compose the
awkward "sorry I disappeared." Fully single-player, no cold start. Competitors:
Contacts Journal 2,354 · Cardhop 1,131 · Mesh 759 · Covve 622 · Dex 245 (2.1x).
Five named reviewers, and [r/adhdwomen on ghosting](https://old.reddit.com/r/adhdwomen/comments/1hr7mts/how_to_be_better_at_not_ghosting_people_i_am/) has 209 comments and **153 distinct usernames** — u/Mother_Lemon8399: *"I still haven't replied to Thanksgiving messages from 3 friends. I think about it every single day but then I feel the shame/cringe at how long it's been."*

The catch, and it's sharp: **every app that cleared 200 ratings is a professional
contact manager; every app purpose-built for friendship is under 200** (Fabriq
164, Top Contacts 173, Catchup 78, Garden 50). Read one way that's an unserved
need. Read the other way, it's ten years of evidence that the friendship segment
doesn't pay.

**"Attention PR" — your longest unbroken focus streak as a personal record.**
Flattest shelf found: Forest 48,949 · Focus Keeper 31,531 · Study Bunny 21,083 ·
Focus To-Do 14,562 · Focus Plant 5,409 · Focus Traveller 3,879 (**1.55x**). People
already quote this number about themselves — [r/GetStudying "How long is your attention span?"](https://old.reddit.com/r/GetStudying/comments/194rskk/how_long_is_your_attention_span/), 64 comments, **42 distinct usernames**, u/Oiljacker: *"Used to be hours and hours. Now Its more like 2 mins."* But only one clean named reviewer on the gap, and Forest could ship "longest unbroken session" as a stats screen in a weekend.

---

## DEAD ENDS — verified, don't re-run these

- **Zyn-only app** — one app over 200 ratings. Not a market yet.
- **Pure impulse-buy wait-timer** — twelve apps, best one has 75 ratings, most have 0–3. A dozen builders had this idea and none found a user. That's a validated *failure* pattern.
- **Attention-span measurement** — best app has 61 ratings. Boredom tolerance: 0. Monotasking: 20. "Finish what you started" cross-media: 18. Empty shelves, not uncrowded ones.
- **Sleep-debt ledger** — only works by measuring how much you slept, which means clinical validation territory. The niche apps have 0, 1 and 2 ratings.
- **Sports betting self-control** — see below.

### On sports betting, specifically

The self-diagnosis is real and painful — [r/problemgambling "How much have you lost gambling?"](https://old.reddit.com/r/problemgambling/comments/14ep51c/how_much_have_you_lost_gambling/) has 232 comments and **120 distinct usernames**, and the OP is 25 describing $15–20k lost.

But the market data says don't. **Gamban — the category's best-known brand, funded and NHS-referenced in the UK — has 43 US ratings.** Bet Block has 287; everything else is under 130. One app clears 200. That's not an under-served market, it's a market that doesn't convert; the people posting in that subreddit are not buying these apps.

And there's a reason beyond the numbers. That user population overlaps heavily with people in active addiction and financial crisis. An effective blocker becomes a safety-critical dependency the moment someone leans on it — a bug at 2am on a Sunday is a relapse. Doing it responsibly means crisis signposting, no treatment positioning, and a plan for people who message you in distress. That's ongoing duty of care, not code. If you want the mechanic, ship it as a user-choosable app category inside Delivery Shield, with no gambling-specific marketing and a helpline link.

---

## THE THING THAT DECIDES ALL OF THIS

Read these, all from the target demographic, all in App Store reviews:

- Aiden15! (Erly, 1★): "IM BROKE AND THEY WANT ME YO PAY MONEY"
- gsjsvdd (Erly, 2★): "no 13 year old needs to pay for an alarm"
- jan_21✌️ (Wayk, 3★): "As a 13 year old i don't have the funds to pay every month."
- Picky game player 2 (Erly, 1★): "U gotta pay I am broke"
- jusbeinghonestfr (Puff Count): "i don't think you should have to pay to quit vaping😭"
- Kaylee dil (Puff Count): "I spend less on nicotine then I would with this app"

Across Erly's recent reviews, **36% mention payment and 38% are 1–2 stars.** On
Wayk it's 29% and 29%.

15–25 is the loudest demographic about its problems and the least willing to pay
to fix them. Every idea in this document is real; the monetisation question is
the same one for all of them, and it isn't solved by picking a better idea. Free
core with a cheap one-time unlock — not a subscription — is what the evidence
points to, and it changes what kind of business you're building.

---

## LIMITS

- Apple's iTunes `/search` endpoint returned 403 for most of this research
  (shared-IP rate limiting), so competitor lists were discovered via web search
  and then verified individually through `/lookup`. Every number is verified;
  the lists may not be exhaustive. Re-run a search sweep before committing.
- "What it lacks" is inferred from App Store descriptions and review corpora.
  Nobody installed and tested these apps. Download the top three competitors for
  whichever you pick and confirm the gap is still open before you write code.
- Review-proportion figures are from the ~250–400 most recent reviews per app,
  not lifetime totals.
