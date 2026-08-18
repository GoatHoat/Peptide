/**
 * Guarantees `public/config.js` exists before dev or build.
 *
 * index.html loads it unconditionally, so without this a fresh clone 404s on
 * every page load — which shows up as a console error and fails every e2e
 * test, a long way from the actual cause.
 *
 * Never overwrites an existing file, so a real key is safe from it.
 */
import { copyFileSync, existsSync } from 'node:fs';

const target = new URL('../public/config.js', import.meta.url);
if (!existsSync(target)) {
  copyFileSync(new URL('../public/config.example.js', import.meta.url), target);
  console.log('created public/config.js from the example (no key set)');
}
