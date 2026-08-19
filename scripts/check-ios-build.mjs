/**
 * The three things that have actually gone wrong before an iOS build.
 *
 * Each of these has cost a real build: a missing RevenueCat key shipped twice,
 * a stale bundle shipped once, and a hidden paywall would have shipped a free
 * app. None of them fail loudly on their own — the app builds fine and is
 * simply wrong — so this refuses instead.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';

const fail = (m) => { console.error('\n  ✗ ' + m + '\n'); process.exit(1); };
const ok = (m) => console.log('  ✓ ' + m);

const CONFIG = 'ios/App/App/public/config.js';
if (!existsSync(CONFIG)) fail(`${CONFIG} is missing — purchases will report "not switched on yet".`);
/* The assigned value only. Checking the whole file matched the word test_
   inside the comment that warns about test_ keys. */
const m = readFileSync(CONFIG, 'utf8').match(/__PEPSTACK_RC_KEY__\s*=\s*['"]([^'"]*)['"]/);
const key = m ? m[1] : null;
if (key === null) fail('No __PEPSTACK_RC_KEY__ assignment found in config.js.');
if (key === '') fail('The RevenueCat key is empty. This build cannot take a payment.');
if (key.startsWith('test_')) fail('This is a Test Store key. It must never ship - anyone could grant themselves Pro.');
if (!key.startsWith('appl_')) fail('That is not an Apple SDK key (expected appl_...).');
ok('RevenueCat key present');

const idx = 'ios/App/App/public/index.html';
if (!existsSync(idx)) fail('No web assets in the iOS project. Did cap sync run?');
const age = (Date.now() - statSync(idx).mtimeMs) / 1000;
if (age > 600) fail(`The iOS copy is ${Math.round(age / 60)} minutes old. Run npm run build && npx cap sync ios.`);
ok('iOS assets are freshly copied');

const billing = readFileSync('src/lib/billing.ts', 'utf8');
if (!/VITE_SKIP_PAYWALL \?\? 'false'/.test(billing)) fail('SKIP_PAYWALL no longer defaults to false — the paywall would be hidden.');
ok('Paywall is enabled');

console.log('\n  Ready to archive in Xcode.\n');
