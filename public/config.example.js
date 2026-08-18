/**
 * Template for `public/config.js`, which is gitignored and holds the
 * RevenueCat SDK key.
 *
 * `scripts/ensure-config.mjs` copies this over when config.js is missing, so a
 * fresh clone always has the file and index.html's script tag never 404s. An
 * absent key is the correct state for a clone: no purchases, never free ones.
 *
 * To switch purchases on, copy this to config.js and set the key. Never commit
 * that file. The public SDK key is not a service-role secret — it ships inside
 * every binary — but the VITE_ rule in CLAUDE.md is absolute and this is how it
 * stays satisfied.
 */
window.__PEPSTACK_RC_KEY__ = '';
