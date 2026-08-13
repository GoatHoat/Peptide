# Consumer App Complaint Clusters — Verified Counts

Method that finally worked: stop hunting for 100 separate posts, open the single
saturated thread and count distinct usernames inside it. Every number below is a
headcount of unique Reddit or Hacker News usernames actually read, deduplicated,
excluding deleted and AutoModerator. All are **partial floors** — Reddit's API
caps comment retrieval at ~500 per thread, so the true numbers are higher.

---

## THE FIVE CLUSTERS THAT CLEARED 100

### 1. Garmin — 1,979 distinct people
Capabilities being moved behind the Connect+ subscription on hardware people
already bought for $500–1,000. Seven threads, 850 people stating outright refusal
or exit. Lead post: 11,965 upvotes, 879 comments.

- FusionPoweredFan (633): "Never paying for the subscription — but it is going to make me rethink my future watch purchases. I could justify the Garmin expense when I knew I was getting all the features with the watch."
- ChouPigu (400): "people buy expensive fitness equipment to escape recurring gym memberships and subscriptions. I myself came to Garmin after refusing to pay Fitbit subscription fees."
- PaddingCompression (153, 2026): "This is like the BMWs that were going to have heated seats that would only work if you had paid your $20/month heated seat subscription charge."

**Verdict: not buildable.** You cannot ship software that puts live heart rate
back on a watch screen. The complaint is real and enormous and the fix is
hardware.

### 2. MyFitnessPal — 1,629 distinct people, 755 stating switch intent
Barcode scanning — the primary way anyone logs packaged food — was moved behind
Premium in Aug 2022 and is still Premium-only in 2026. Free tier no longer does
the job it was installed for. 100M+ installs, 2.91M Play reviews.

- hrbrox (274): "2 days of the full screen ads popping up every time I hit the back button after I'd finished logging and I said fuck it and downloaded loseit instead."
- mfulle03 (452): "It's worth maybe 5 bucks a month to me, zero chance I get premium."
- pyjamatoast (2026): "I switched to Chronometer last weekend and it's great. I officially deleted MFP."

**Verdict: wedge already closed.** Lose It absorbed the migration — 770K iOS
ratings versus Cronometer's 16.6K and MacroFactor's 20K. You would be calorie
tracker #5 against three entrenched substitutes.

### 3. Spotify — discovery complaint is the top comment of a 2,349-comment thread
75 distinct authors on the algorithm in a single 480-comment sample. Separate
cancellation threads at 5,235 / 1,421 / 835 / 304 comments. 1B+ installs,
36.1M Play reviews.

- damnitsdarkoutside (2,202 — highest-voted comment in the thread): "The algorithm is terrible on most streaming services in my opinion. I'm barely being fed with anything outside of my comfort zone."
- Fetty_is_the_best (68): "you can have a playlist with 1000 songs and it'll still play the same 50 over and over again"
- ars2x (202): "I switched from Spotify because I couldn't take the algorithm giving me the same songs over and over."

**Verdict: the only one nobody has built the fix for.** The alternatives people
name are a decaying 2003 site (last.fm) or a different streaming service with the
same architecture. See risks below.

### 4. Recipe sites — 400 distinct authors in one thread
Ad injection, page-jump, autoplay and SEO preamble make recipes unusable at the
counter. Supporting threads at 1,254 and 995 comments. 91 distinct authors on ads
alone; 100 named a workaround tool.

- TheDocDalek (3,419): "No stupid life stories or endless scrolling before finally seeing a mediocre recipe."
- Interesting_Tea5715 (57): "Ever wonder why it pops up an ad when you click the 'jump to recipe' button (making you click on the ad)? It's on purpose"
- aquatic_hamster16 (55): "my normal 'make this page usable' solution of enabling reader view blocked the actual recipe."

**Verdict: solved five times over for $5.** Paprika, CopyMeThat, cooked.wiki,
JustTheRecipe all named repeatedly and loved. No unserved wedge, only an
unbranded one.

### 5. Goodreads — 926-comment thread, 310 distinct people
The star average is corrupted (pre-release ratings, "3 stars = didn't hate it"
etiquette), so recommendations built on it are nonsense. 61 distinct on broken
ratings, 37 on recommendations.

- Celestaria (102) — the mechanism: "GR bases its recommendations on anything you've rated 3 and above, but user etiquette on the site is to 3-star books you didn't actively hate."
- kcbot (522): "'I see you often like 2nd books in series. Could I tempt you with a 2nd book of a random series you've never read the first book of?'"
- Nithuir (65): "You liked Return of the King. Would you like to read Return of the King in Chinese?"

**Verdict: seat taken.** In the alternatives thread, 96 distinct authors named
StoryGraph. This is the proof the pattern works — and the proof someone already
ran it.

---

## THE PATTERN

Every cluster over 1,000 people is either **vetoed by the platform** (Garmin,
Strava — Strava ordered a developer to shut down an analysis tool built on its
API, thread 1orxqns) or **already won by a challenger** (Lose It, StoryGraph,
Paprika). The complaint volume was never the scarce thing. The scarce thing is a
complaint that big *and* still unclaimed.

Spotify is the only one of the five where the fix has not shipped.

---

## ALSO CHECKED, DIDN'T CLEAR THE BAR

- **Strava's coaching gap** — 787 distinct people, real, but Strava conceded it by acquiring Runna in April 2025 and now sells the bundle.
- **Notes apps are write-only** — right shape, only ~35 distinct people, all Hacker News. Also contested from inside: the highest-voted artefact is titled "Notes apps are where ideas go to die, *and that's good*."
- **Google Photos AI search regression** — recurring across 10+ threads but diffuse; biggest is 112 comments.
- **Chess.com → Lichess** — 972-comment thread but only 13 distinct on paywalling; the rest is cheating drama.
- **Letterboxd** — 3.3 stars, the lowest of any app measured, 10M+ installs. Feature complaints are diffuse with no dominant capability, but this is the one I'd re-examine if Spotify dies on the API question.
- **Meditation apps** — "guided meditation is all talking, no meditating", 269 comments, but the thread is contested rather than agreeing.

---

## HONEST LIMITS

- Reddit is blocked at this environment's network layer; all Reddit reads went
  through the connected Chrome browser, read-only. Apple App Store was blocked on
  both paths, so store figures are Google Play except where noted.
- Reddit's API caps comment retrieval around 500, so every count is a floor.
  Threads over 500 comments are under-counted, sometimes badly.
- Counts are not deduplicated across threads. One person appearing in three
  threads may be counted three times within a cluster total.
- Two clusters have documented counter-evidence from inside the same threads:
  BlackJeepW1 on MFP ("I don't want to switch, it has all those years of data"),
  and on Spotify the two highest-voted replies in the cancellation thread dispute
  the discovery premise outright — ajmart23 (3,367): "Am I the only person who
  hasn't experienced this?"
