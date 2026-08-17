/**
 * Where the legal pages live, and how to open them.
 *
 * These have to be absolute, and they have to open outside the app. Inside the
 * iOS wrapper the whole product is one WebView, so `<a href="/terms">` navigates
 * that WebView to the terms page and leaves the user with no back button and no
 * way to return — the app is simply gone until it is force-quit. A reviewer
 * finds that in about thirty seconds, and it is a Guideline 2.1 rejection on its
 * own, quite apart from the policy the link was there to satisfy.
 *
 * `target="_blank"` hands the URL to the system browser instead, which keeps the
 * app running behind it.
 *
 * VITE_SITE_URL is public by design — it is the address of a page anyone can
 * read without signing in. It carries no secret. Point it at the production
 * domain at build time; the fallback is the current deployment.
 */
const SITE = (import.meta.env.VITE_SITE_URL ?? 'https://www.pepstack.fit').replace(/\/$/, '');

/*
 * The documents are served by the website, not bundled with the app. Two copies
 * of a legal document is worse than one: they drift, and the version a user was
 * shown stops being the version that can be produced later. `public/terms.html`
 * and `public/privacy.html` were deleted for that reason.
 */
export const TERMS_URL = `${SITE}/terms.html`;
export const PRIVACY_URL = `${SITE}/privacy.html`;

/** The props every legal link needs, so no call site can forget one. */
export const externalLink = { target: '_blank', rel: 'noreferrer noopener' } as const;
