/**
 * The name, in one place.
 *
 * Pepstack is taken on the App Store, so the app will be renamed before it
 * ships. This module exists so that is a one-line edit rather than a
 * find-and-replace across fourteen files and four config formats — the kind of
 * change where one missed string ends up in a screenshot.
 *
 * WHAT LIVES HERE: anything a user reads or a store lists. What does not:
 * internal identifiers, localStorage key prefixes, table names, CSS classes.
 * Renaming those would be churn with real regression risk and no visible gain —
 * a storage key called `pepstack.ask.v1` is not something anybody sees, and
 * changing it would orphan every saved thread on every device.
 *
 * THREE PLACES THIS CANNOT REACH, because they are read before any JavaScript
 * runs and each has its own format. Change them together with `NAME` below:
 *
 *   index.html            <title>
 *   capacitor.config.ts   appName, appId
 *   package.json          name
 *
 * They are listed in the rename checklist at the bottom of this file.
 */

/** The display name, as a user reads it. */
export const NAME = 'Pepstack';

/**
 * The assistant's name.
 *
 * Derived rather than written out, because it was written out — as
 * "PepStack AI", with a capital S — and shipped alongside "Pepstack Pro" in
 * the same session. A second spelling of your own name is also the thing that
 * survives a find-and-replace when the app is renamed.
 */
export const AI_NAME = `${NAME} AI`;

/** The paid tier, named wherever it is sold. */
export const PRO_NAME = `${NAME} Pro`;

/** Reverse-DNS bundle identifier. Must match capacitor.config.ts and Xcode. */
export const BUNDLE_ID = 'app.pepstack.ios';

/** Where the site and the legal documents live. See lib/legal.ts. */
export const DOMAIN = 'www.pepstack.fit';

/**
 * THE RENAME CHECKLIST.
 *
 * Changing `NAME` above covers every string the app renders. These four are
 * outside JavaScript's reach and have to be edited by hand, in this order:
 *
 *   1. index.html          — <title>, and the apple-mobile-web-app-title meta
 *   2. capacitor.config.ts — appName (display name) and appId (bundle id)
 *   3. package.json        — "name", lowercased and hyphenated
 *   4. ios/App/App/Info.plist — CFBundleDisplayName, and the Xcode target's
 *      PRODUCT_BUNDLE_IDENTIFIER if the bundle id changed
 *
 * Then `npx cap sync ios`, or Xcode builds the old name.
 */
