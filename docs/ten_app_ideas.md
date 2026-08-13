# 10 B2C App Ideas That Passed All Five Gates

Every idea below meets all of these, verified individually:

1. **5+ competitors each with 200+ ratings** (exact counts, pulled from Apple's
   iTunes lookup/search APIs on 2026-08-08)
2. **No competitor dominates** — nothing above a 20x gap between #1 and #2
3. **Buildable solo with code and API keys** — no hardware, no payments or
   banking licence, no medical advice, no content licensing, no marketplace
4. **Demand proven by name** — either 3+ named App Store reviewers complaining a
   specific capability is missing, or a Reddit thread with 60+ comments where
   distinct usernames were counted
5. **One specific gap** the competitors don't fill

Ranked by how good the evidence is, not by how fun they sound.

---

## 1. Duration calibrator — "you say 30 minutes, you average 74"

**What it is:** Before starting a task you guess how long it'll take. The app
times the real thing. After a few weeks it tells you your personal error
multiplier per task type and rewrites your future estimates.

**The gap:** Every planner makes you *type* a duration. Not one of them ever
compares that number to what actually happened.

**Competitors:** Structured 163,792 · Flora 82,459 · Forest 48,949 · TickTick
44,925 · Focus Keeper 31,531 · Tiimo 18,688 · Routine Planner 17,560 · Focus
To-Do 14,562. Top is 2.0x second — wide open.

**Evidence:** [r/ADHD, "'How long will it take you to do this?' is the worst question you could ask me"](https://old.reddit.com/r/ADHD/comments/mkx0io/how_long_will_it_take_you_to_do_this_is_the_worst/) — 267 comments, 178 distinct usernames rendered, **64 distinct usernames** specifically on estimation failure.
- u/Adhd-tea-party247: "The ability to determine how long something will take is some like of sorcery — I don't know how people do it."
- u/PolarBruski: "I suck at time estimates, I've just learned to pad it a lot."
- u/IWannaBangKiryu: "I've made thousands of social media posts in the past year but I still can't tell you how long it takes to do one."

**Build:** Local SQLite, Live Activities for the running timer, one LLM call to
bucket task titles into categories so the multiplier is per-category. No external
data. Hardest part: people forget to stop the timer, which poisons the data — you
need idle detection and "did you finish at 3:40 or 4:15?" repair prompts.

**Against it:** Structured could ship estimate-vs-actual in one release with
163,792 ratings behind them. And "you are 2.4x optimistic" reads as deflating to
some users. Market it as scheduling, never as ADHD treatment.

---

## 2. Magic: The Gathering bulk collection scanner

**What it is:** A collection app whose whole design goal is getting 5,000
physical cards *in* — OCR the collector number printed on the card instead of
image-matching the artwork.

**The gap:** Every MTG app has a scanner and every one fails on the case that
matters — bulk-entering an existing collection — because image hashing breaks on
foils, alternate art and dark frames.

**Competitors:** MTG Scanner (Dragon Shield) 3,738 · Carbon 3,502 · TopDecked
2,768 · ManaBox 1,685 · Moxtopper 1,051 · Card Binder 535 · Gauntlet 306 ·
Cascade 279. Smooth distribution, 13.4x top-to-bottom.

**Evidence:** 7 named reviewers across 2 apps on the same failure.
- Surge_001 (ManaBox, 3★): "scans in about one in every 25 to 100 cards correctly and rest you have to search and input manually. Took me 3 days just to get through the 500 or so cards in my binders."
- Lavode (MTG Scanner, 2★): "Bulk scanner can't handle black cards… auto corrects the first entry of a card in the database, resulting in the wrong artwork most of the time. Database of cards often lags a few weeks behind release."
- brando98204829 (MTG Scanner, 3★): "it'll get completely stuck on one card and I'm spending 30 seconds trying from every angle distance and lighting"
- Talons89 (ManaBox, 4★): "why can't I just scan right into a master collection?"

**Build:** Scryfall API — free, no key, verified live, and it ships bulk data
files so you can hold the entire card database offline (which kills the "DB lags
new sets" complaint outright). Apple Vision for on-device OCR. Hardest part:
reading the bottom-left collector line on foils under bad lighting, fast enough
to riffle a box. Pre-2015 cards have no collector number and need a fallback.

**Against it:** Scryfall's terms forbid paywalling their card data, so you
monetise the scanning, not the data. And the incumbent is published by Dragon
Shield — a sleeve manufacturer treating the app as marketing, who can outspend
you on the exact computer-vision problem that is your whole moat.

---

## 3. Barcode-first home inventory

**What it is:** Cataloguing your house's contents where adding an item is one
camera pass — scan the barcode or receipt, name/brand/model/price fill in.

**The gap:** Every competitor has a barcode scanner and all of them fail at the
lookup behind it. This one treats "photo in, correctly-named item out" as the
entire product, with multi-source UPC lookup plus a vision/LLM fallback.

**Competitors:** iCollect Everything 13,454 · Sortly 9,434 · Stockroom 1,442 ·
Home Contents 1,430 · Boxes 939 · Inventory Tracker++ 653 · Nest Egg 615 ·
MyStuff2 Pro 532 · Under My Roof 501 · Everspruce 468 · SnapFind 400 · Supplies
292. **Twelve apps over 200 and the top is only 1.4x the second** — the flattest
category found anywhere in this research.

**Evidence:** 5 named reviewers, 3 apps. 73 of 773 reviews scanned mention
barcodes; 31 of those are complaints at 4★ or below.
- Inobody12345 (Nest Egg, 1★): "Barcode scanner is terrible. Useless if you can't scan collectible bar codes and lookup."
- Joe Blow 07 (Under My Roof, 1★): "I have no idea how in 2022 with all the barcode scanner lookup apps out there this one still doesn't work."
- Ashley - from Tejas (Nest Egg, 1★): "You can't scan a barcode easily, if at all… because the app doesn't have a tap-to-focus feature."
- Loganna26 (Under My Roof, 4★): "I wish they would add the ability to input a UPC number instead of only being able to scan a barcode."

**Build:** VisionKit DataScanner, Apple Vision OCR for receipts, a commercial UPC
database key with a second source as fallback, LLM to structure messy OCR,
CloudKit sync, PDFKit export. Hardest part: UPC coverage is genuinely bad outside
groceries and media — furniture, tools and older appliances will miss, so the
photo→vision→LLM fallback has to make a miss still feel like a win.

**Against it:** Home inventory is a category people start and abandon, because
the payoff only arrives after a disaster most people never have. Twelve small
apps splitting a market is also consistent with a market too small to feed any
of them.

---

## 4. Grocery price memory

**What it is:** A shopping list that remembers what *you* paid for each item at
each store, so the list shows last-paid price and unit price beside every item
and tells you whether a "sale" is actually cheap.

**The gap:** The big shared-list apps let you type a price for today's trip. None
keeps a per-item, per-store price history.

**Competitors:** Our Groceries 84K · AnyList 80K · Out of Milk 10K · Listonic 10K
· Bring! 9.8K. Top two are 84K and 80K — genuinely no dominator.

**Evidence:** 4 named reviewers, and the Our Groceries developer replied in
public confirming the gap.
- MaryBall143 (Our Groceries, 5★): "I wish there was a feature where I could enter what price I paid last time. This way, when I see a 'sale' or coupon I would know if it was a good deal or not." → developer replied: "We hear you about prices and sizes, and are making plans for those features."
- Brownysxx (Out of Milk, 2★): "I have to add prices to my items EVERY WEEK… So I have to select the correctly categorized version of the item and re-enter the price EVERY WEEK."
- JessvstheWorld (Out of Milk, 5★): "The first is that a weight option be added to pricing… Being able to price things according to weight will help keep the accuracy of my overall budget."

**Build:** No mandatory third-party API — the price data is the user's own.
Optional receipt OCR via Apple Vision. Hardest part: item identity resolution,
matching "GV 2% MLK GAL" on a Walmart receipt to the "milk" you track at Kroger,
plus unit-price normalisation across sizes.

**Against it:** Household list apps have brutal switching costs — the whole
family has to move at once. And Our Groceries' developer has *publicly committed
to shipping prices*, which would erase your differentiator.

---

## 5. Bill tracker for bills whose amount changes

**What it is:** A bill-due calendar with no bank connection that treats every
bill as a range, learns each biller's history, forecasts the month, and keeps a
permanent per-biller payment record.

**The gap:** Every manual bill tracker stores one fixed amount per recurring
bill, so utilities either get faked with a padded estimate or silently overwrite
last month's record.

**Competitors:** Bills Organizer & Reminder 24K · Chronicle 3.8K · Bills Monitor
565 · What's Due 307 · BillOut 262.

**Evidence:** 5 named reviewers, including one describing the workaround.
- bahgiejan (Bills Organizer, 2★): "Why can't I change the bill amount on recurring bills?… my electricity bill is due on the same day every month, but never for the same amount. It defeats the purpose if I have to re-enter this bill every month."
- Peggys ipad (BillOut, 2★): "it will not keep a history of past payments… when you add the current electric bill it will erase all payments previously enter on the electric bill payment."
- KKorwal (Bills Monitor, 1★): "sometimes I've found it has changed the PREVIOUS bill to that amount, and now says I still owe for a previous month when that bill was paid in full."
- AshleyQuana (5★, the workaround): "For utilities that fluctuate, it's good to take the highest price you've ever had for that utility, add a couple dollars, and use that as the amount for scheduling it to all future months."

**Build:** Zero third-party APIs. Local notifications, CloudKit, and forecasting
that is just per-biller descriptive statistics. Deliberately avoids Plaid — and
multiple reviewers name refusal-to-link-a-bank as why they chose these apps.
Hardest part: the recurrence engine (biweekly, month-end clamping, business-day
shifts) reconciled with a payment event stream.

**Against it:** Manual-entry apps have terrible retention, and the moment a user
wants automation they leave for a bank-linked product you can't legally build
alone. You'd be competing with a free 24K-rating incumbent for a $3 purchase.

---

## 6. Wedding guest list, unbundled

**What it is:** One screen with every guest's address, party size, meal choice
and RSVP state, plus automated reminder sequences over email and SMS. No
registry, no vendor marketplace, no website builder.

**The gap:** Every major wedding app treats the guest list as an appendage to a
registry business, so the highest-frequency task is desktop-only or requires
tapping into each guest individually.

**Competitors:** The Knot 218,855 · Paperless Post 126,171 · Zola 95,747 ·
WeddingWire 45,821 · Joy 8,677. Top is 2.3x second.

**Evidence:** 4 named reviewers plus a counted thread.
- Trying to plan (The Knot, 2★): "There's no way to see the full guest list and their addresses all in one place. Instead, you have to click each individual name just to view their address, which wastes a ton of time. For anyone managing a large event, this is a nightmare."
- Piñaa25 (The Knot, 4★): "I cannot access my guest list on my phone only on my laptop."
- [r/weddingplanning RSVP reminder thread](https://old.reddit.com/r/weddingplanning/comments/1eyx85w/i_sent_a_friendly_rsvp_reminder_a_week_out_and/) — 348 comments, **158 distinct usernames**, 128 of them on RSVP chasing. u/No-Reporter7945: "It is great to send a reminder because people will genuinely forget."

**Build:** Transactional email, SMS, address autocomplete, CSV/PDF export. No
cold start — guests click a link and install nothing. Hardest part: per-guest
reminder state without double-texting a household sharing one phone number.

**Against it:** The Knot and Zola give this away free because they monetise
registry and vendor leads downstream. You'd charge for something two funded
incumbents subsidise to zero — and every customer churns permanently about 12
months after signup.

---

## 7. Kids' party invites that chase the RSVPs

**What it is:** A parent-facing invitation app whose default behaviour is
automatic escalating nudges — viewed-but-not-replied detection, deadline
auto-assume, headcount export for the venue — rather than a card-design tool.

**The gap:** Invitation apps optimise for making a pretty invite and stop caring
once it's sent, leaving the parent to chase the families who opened it and never
replied.

**Competitors:** Evite 512,600 · Partiful 226,190 · Paperless Post 126,171 ·
Punchbowl 109,925 · Zazzle Events 102,121 · Invitation Maker 46,189. Top is 2.3x
second.

**Evidence:** 4 named Evite reviewers plus a counted thread.
- JJ Ups (2★): "No way to update manually someone's rsvp. No way to update contact info. The iOS version is a basic as it can be making it nearly unusable."
- ReviewWriter1234567 (1★): "People have been replying to my evite and there's no way to view their messages. Bummer since it resulted in people missing the event."
- [r/Parenting RSVP courtesy thread](https://old.reddit.com/r/Parenting/comments/1sf4vct/am_i_overthinking_this_or_has_rsvp_courtesy/) — 87 comments, **60 distinct usernames**, 44 on the no-reply problem.

**Build:** SMS, email, link-open tracking, Contacts import, .ics generation.
Hardest part: viewed-but-not-replied detection survives Apple Mail Privacy
Protection only if you infer engagement from unique link hits, not pixels.
Keep the child as a string field on the event, never a user account — child
logins pull you into COPPA.

**Against it:** Evite is free and universally recognised, and the failure is
social rather than technical. Parents who ignore an invite will ignore your third
reminder too.

---

## 8. A blocker you genuinely can't switch off

**What it is:** A screen-time blocker whose defining feature is that you can't
quietly disable it — unblocking needs either a delay you set while sober or a
release code held by a person you nominated, with every override logged and
shown to them.

**The gap:** Every software blocker can be disabled by the person it's blocking,
in under a minute, exactly when their judgement is worst. The only things that
actually work today are a partner's passcode or a $60 physical NFC puck.

**Competitors:** Opal 85,505 · BePresent 60,818 · Brick 49,200 · ScreenZen 46,869
· one sec 23,329 · Brainrot 19,328 · Refocus 10,749 · ClearSpace 8,768. Top is
1.4x second, ten apps over 6,000.

**Evidence:** [r/nosurf thread on removing the "ignore for today" button](https://old.reddit.com/r/nosurf/comments/115b8ns/ios_screen_time_app_how_to_remove_the_ignore_for/) — 70 comments, **32 distinct usernames**.
- u/ToadWithAFlower (OP): "I just keep clicking the 'remind me in 15 minutes' or the 'ignore for today' buttons. For me that's like asking an alcoholic if they want to order one more glass over and over again."
- u/AgreeableArdvark42: "This is such an Issue with all of the 'App blockers.' There is always a way to bypass them or disable them with only a few clicks."
- u/Illustrious_Cat5404: "I had my boyfriend set parental controls on my phone because I couldn't stop giving myself more screen time, and I just came across this while trying to figure out how to bypass them."
- alexx amelia (Opal review): "i often set 12 hour timers to shut off social media. it'll automatically turn itself off after like 4 hours with this most recent update."

**Build:** FamilyControls / ManagedSettings / DeviceActivity (Apple's Screen Time
API, free, requires an entitlement request), CloudKit for buddy state, APNs.

**Against it — and this one is serious:** the core promise may be unshippable at
full strength. Your app can't hold the device's Screen Time passcode, and a user
can always delete your app, which drops your shields. If the honest version is
"stickier friction plus a friend who gets a text," Opal copies it in a sprint —
and Brick already owns the genuinely-enforced position with hardware you're
excluded from building.

---

## 9. Home maintenance schedule derived from your actual house

**What it is:** Photograph the model plates on your furnace, water heater and
dishwasher, answer a few questions about the house, and the app generates your
recurring maintenance calendar with climate-aware timing.

**The gap:** Every competitor is an empty container that assumes you already know
which tasks belong on the list and how often — which is exactly the knowledge new
homeowners say they don't have.

**Competitors:** Chores! 109,067 · FlyLady 22,415 · Chorsee 11,419 · Tody 10,578
· Sweepy 10,331 · Spruce 5,125 · Hippo Home 1,593 · Under My Roof 501 · House
Stack 222. Top is 4.9x second.

**Evidence:** [r/homeowners, "How do you guys remember all the different maintenance schedules?"](https://old.reddit.com/r/homeowners/comments/1m6tk8r/how_do_you_guys_remember_all_the_different/) — 534 comments, **120 distinct usernames** counted.
- u/Zrayve (OP): "Been in my house for 2 years and I'm drowning in things I'm supposed to remember" — HVAC filters ("monthly? every 3 months? I honestly don't know anymore"), water heater flush ("apparently this is a thing?"), after paying $300 to fix a dryer he didn't know needed annual vent cleaning.
- u/Phenolphthaleiny: "I get my first home next week and I am overwhelmed with the concept of house maintenance."
- u/marvin32002 (top concrete answer, 36 pts): keeps it in "a 'home' binder" of self-made spreadsheets, and multiple strangers in the thread asked him to DM copies.

**Build:** Vision OCR for model plates, a rules engine mapping equipment class
and age to intervals, WeatherKit for season-aware timing, CloudKit sharing. No
data licence needed. Hardest part: the equipment-to-interval knowledge base has
to be right and broad enough to feel magical.

**Against it — read this one carefully:** of 761 reviews scanned across the chore
apps, only **10** mentioned filters, gutters, HVAC or appliances at all. The
people paying for recurring-task apps today are buying *cleaning* schedules. The
pain is real and widely felt; the evidence that anyone pays for it is the
weakest in this document. And the thread's own top answer — "just use your
calendar" — is free and already installed.

---

## 10. Shared gift ledger for couples

**What it is:** One live shared ledger of gift ideas, purchases, budgets and
history across every occasion, with per-recipient privacy so the person being
bought for can't see their own surprises.

**The gap:** Every high-rated gift app is either a private single-device
Christmas ledger or a public wish-list registry. None gives two co-shoppers one
live shared record of who bought what and what's been spent.

**Competitors:** Christmas Gift List Tracker 27K · Giftster 18K · The Christmas
Gift List 6K · Santa's Bag 5.8K · The Christmas List 5.1K · GiftPlanner 792.

**Evidence:** 4 named reviewers across 4 apps asking for the same thing.
- Xfyre007: "Need to be able to share the lists with other users and allow them to add/edit. My husband and I both buy gifts for family members and being able to do that would make it so much easier to keep track of everything and see what the other person has purchased."
- Spaulding Smails (Santa's Bag, 5★): "I would love to see ability to sync the app with my wife."
- ArielleS (GiftPlanner, 3★): "There is no family sharing ability with a pro account."
- Asabo (The Christmas Gift List, 2★): "Wanting one my husband And I could use and share easily."
- On the year-round half — Kristal_Science (Santa's Bag, 5★): "I would pay another fee to add a whole separate section for birthday ideas and gifts."

**Build:** CloudKit shared zones or Firebase, push, OpenGraph unfurling for
product-link imports. No third-party data. Hardest part: asymmetric visibility —
the same record fully visible to co-shoppers and invisible to the recipient.

**Against it:** Demand is violently seasonal — nearly every review date clusters
November to December. And "share with my spouse" is a feature the incumbents can
ship in one release, not a defensible product.

---

# CUT, AND WHY

These reached the shortlist and failed on something specific:

- **Car maintenance tracker** — OEM service schedules per VIN aren't free or open
  data, and CARFAX Car Care (125,691 ratings) is free, backed by a data monopoly.
- **Discogs offline vinyl browser** — the two things that make it good (cover art
  and marketplace prices) are exactly what Discogs classifies as Restricted Data
  and forbids commercially. There's also a six-hour data-freshness rule aimed
  squarely at the offline cache that would be the whole product.
- **Group trip commitment tracker** — real thread (288 comments, 233 distinct
  usernames), but it needs five friends to install it, and the thread's own
  top-voted answer is "don't travel with them," meaning the market's preferred
  fix is to abandon the trip rather than buy software.
- **Public speaking rehearsal with hostile Q&A** — good LLM fit, seven
  competitors, but the whole non-accent segment tops out around 10,000 ratings.
  The money there is enterprise sales training, not a consumer subscription.
- **Board games, comics, LEGO, aquariums, yarn** — board games and comics die on
  non-commercial-only API licences (BGG, Comic Vine). LEGO and aquariums have
  perfect competitor structure but the complaints don't converge on any single
  missing capability.
- **Flashcards** (Quizlet is 52x the runner-up), **language learning** (Duolingo
  48x), **document scanning** (36x), **sneakers, gardening, birding, wine** — all
  closed by a single dominant player.
- **Package tracking, subscription tracking, family calendars, chores, pet care,
  personal CRM** — either too few 200+ competitors, one 20x+ dominator, or the
  complaints scatter with no repeated missing capability.

---

# HONEST NOTES ON THE EVIDENCE

- Reddit is blocked at this environment's network layer; all Reddit reads went
  through the connected Chrome browser, read-only. Reddit's API caps comment
  retrieval around 500, so every distinct-username count is a floor.
- Apple rounds public rating counts above ~1,000. Where you see "27K" that's
  Apple's own rounding; where you see 218,855 it came from the lookup API.
- "What it lacks" in the competitor tables is inferred from each app's review
  corpus and store positioning. Nobody installed and tested these apps hands-on.
  Before committing to any of these, download the top three competitors and
  confirm the gap is real — a gap that closed six months ago will still look
  open in an eighteen-month-old review.
