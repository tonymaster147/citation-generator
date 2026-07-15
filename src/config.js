// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
// Keys are NOT hardcoded here (that would leak them into the public repo).
// They are supplied via an environment variable:
//   - Local dev:  put them in a `.env` file (gitignored):  VITE_GEMINI_API_KEY=...
//   - Deployed:   set a GitHub Actions secret VITE_GEMINI_API_KEY (injected at build)
//
// MULTIPLE KEYS: separate them with commas. Each key has its OWN free-tier quota,
// so when one is rate-limited (429) the app automatically rotates to the next:
//   VITE_GEMINI_API_KEY=keyA,keyB,keyC
//
// NOTE: because this is a frontend-only app, the keys still end up inside the
// built JS bundle on the LIVE site and can be read by visitors. Restrict each key
// in Google AI Studio (HTTP referrer + Generative Language API only), or move them
// behind a serverless proxy. See README.md.
// ---------------------------------------------------------------------------

export const GEMINI_API_KEYS = String(
  import.meta.env.VITE_GEMINI_API_KEYS || import.meta.env.VITE_GEMINI_API_KEY || ''
)
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean)

// Free-tier friendly model. "gemini-flash-latest" is a stable alias that always
// points at Google's current free Flash model, so it won't go stale.
export const GEMINI_MODEL = 'gemini-flash-latest'

// If the primary model is overloaded (503) or rate-limited (429), the app
// automatically tries these fallbacks in order. Each model has its OWN free-tier
// quota bucket, so falling back to a different model recovers from a 429 that the
// primary can't. "gemini-flash-lite-latest" has the most generous free limits and
// is the reliable safety net. (Note: gemini-2.5-flash 404s on new keys, so it's
// intentionally not listed.)
export const GEMINI_FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-flash-lite-latest']
