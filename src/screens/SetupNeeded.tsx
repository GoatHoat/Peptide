/**
 * Shown in place of the app when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are
 * missing. The app cannot run without them — every screen reads its data from
 * Supabase — but it should say so rather than render nothing.
 */
export function SetupNeeded() {
  const missing = [
    { key: 'VITE_SUPABASE_URL', set: Boolean(import.meta.env.VITE_SUPABASE_URL) },
    { key: 'VITE_SUPABASE_ANON_KEY', set: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY) },
  ];

  return (
    <div className="setup">
      <div className="setup-inner">
        <h1 className="setup-title">Not configured yet</h1>
        <p className="setup-body">
          Pepstack reads every screen — your doses, stack and profile — from Supabase, so it needs
          your project&rsquo;s address and public key before it can start.
        </p>

        <div className="setup-vars">
          {missing.map((v) => (
            <div className="setup-var" key={v.key}>
              <span className={`setup-dot ${v.set ? 'on' : 'off'}`} />
              <code>{v.key}</code>
              <span className="setup-state">{v.set ? 'set' : 'missing'}</span>
            </div>
          ))}
        </div>

        <ol className="setup-steps">
          <li>
            Open your Supabase project, then <b>Project Settings → API</b>.
          </li>
          <li>
            Copy the <b>Project URL</b> and the <b>anon public</b> key. Not the service role key —
            that one must never go in a browser build.
          </li>
          <li>
            Paste both into <code>.env</code> in the project root, one per line.
          </li>
          <li>
            Locally the dev server restarts by itself. For the deployed site, add the same two
            values in the Vercel project settings and redeploy — Vite bakes them in at build time,
            so a redeploy is required.
          </li>
        </ol>
      </div>
    </div>
  );
}
