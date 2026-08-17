# Switching payments on — the ordered list

The code is done and **none of it has ever run**. There is no Apple Developer
account, no App Store Connect products and no RevenueCat key, so nothing below
has been tested against a transaction. This is the sequence, in the order it has
to happen, because the sequencing is the part that goes wrong at 2am.

Every step is yours. I cannot do any of them.

---

## 1. Apple Developer Program

Enrol as the **legal entity**, not as an individual — guideline 5.1.1(ix)
expects that for health apps, and the entity must match the one named in the
privacy policy, which is still a placeholder.

## 2. App Store Connect — the app record

Bundle id **`app.pepstack.ios`** (`src/lib/brand.ts`, `BUNDLE_ID`).

## 3. App Store Connect — two subscription products

One **Subscription Group** — call it `Pepstack Pro`. Both products go in it, so
Apple handles upgrade and downgrade between them and 3.1.2(b) is satisfied
without any code.

| Reference name | Product ID | Duration | Price |
|---|---|---|---|
| Pepstack Pro Annual | `app.pepstack.ios.pro.annual` | 1 year | **$49.99** |
| Pepstack Pro Monthly | `app.pepstack.ios.pro.monthly` | 1 month | **$4.99** |

The ids are in `src/lib/revenuecat.ts`, `PRODUCT_IDS`. The prices are in
`src/lib/billing.ts` as `ANNUAL_CENTS` and `MONTHLY_CENTS` — **if you change a
price here, change it there too**, or the paywall advertises one number and
Apple charges another, which is 2.3.1.

Each product needs a localised display name, a description, and a review
screenshot, or the product stays in "Missing Metadata" and never appears.

## 4. RevenueCat

- New project, iOS app, bundle id as above.
- Add both products by the ids in the table.
- Create **one entitlement, id `pro`** — `src/lib/revenuecat.ts`,
  `ENTITLEMENT_ID`. Attach both products to it. One entitlement is what makes
  "is this account Pro" a single check rather than a list of ids to keep in step.
- Create an **Offering** and mark it **current**, with both products as
  packages. The code reads `offerings.current`; without a current offering there
  is nothing to buy.
- Upload the **App Store Connect API key** so RevenueCat can validate receipts.

## 5. The key, onto the device only

Copy the **public iOS SDK key** from RevenueCat. It is not a service-role
secret, but it still does not belong in a committed bundle.

Write `ios/App/App/public/config.js` — already in `.gitignore`:

```js
window.__PEPSTACK_RC_KEY__ = 'appl_xxxxxxxxxxxxxxxxxxxxx';
```

and reference it from `index.html` **before** the bundle, or inject it from the
iOS shell.

**Not an `import.meta.env` variable.** Vite only exposes `VITE_`-prefixed
variables to client code, and `VITE_` variables are inlined into the bundle and
are public — so "from the environment" and "not `VITE_`" cannot both be true
through `import.meta.env`. A runtime global is the shape that satisfies both.

## 6. Verify before flipping anything

With the key in place and `SKIP_PAYWALL` still `'true'`, run on a device with a
**sandbox account** and confirm in the console that RevenueCat configures and
`getOfferings()` returns two packages. `purchasesAvailable()` is what gates
everything; until it is true, `purchase()` is still the stub.

## 7. The line you flip last

`src/lib/billing.ts`:

```ts
export const SKIP_PAYWALL = (import.meta.env?.VITE_SKIP_PAYWALL ?? 'true') === 'true';
```

Set **`VITE_SKIP_PAYWALL=false`** in the production build — do not change the
default in the file. Flip it in the same session you verify step 6, never
before. Guideline 2.1(a): a reviewer who never reaches the paywall reports the
IAP as missing; guideline 3.1.1: a paywall that grants the tier without charging
is the fastest rejection available.

---

## What is still not wired after all of that

**Nothing writes `profiles.subscription_tier`.** RevenueCat will report the
entitlement to the device, but the server-side tier — which is what the Edge
Function reads for the assistant cap and what the stack-limit trigger enforces —
is a separate step: a RevenueCat webhook into a Supabase function that sets the
column. Until that exists, a purchase unlocks the client and not the server.

**Migration `0037_tiers` is not applied**, so `my_entitlement()` does not exist
and every account reads as free regardless.
