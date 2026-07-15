// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
// The key is NOT hardcoded here (that would leak it into the public repo).
// It is supplied via an environment variable:
//   - Local dev:  put it in a `.env` file (gitignored):  VITE_GEMINI_API_KEY=...
//   - Deployed:   set a GitHub Actions secret VITE_GEMINI_API_KEY (injected at build)
//
// NOTE: because this is a frontend-only app, the key still ends up inside the
// built JS bundle on the LIVE site and can be read by visitors. Restrict the key
// in Google AI Studio (HTTP referrer + Generative Language API only), or move it
// behind a serverless proxy. See README.md.
// ---------------------------------------------------------------------------

export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

// Free-tier friendly model. "gemini-flash-latest" is a stable alias that always
// points at Google's current free Flash model, so it won't go stale.
export const GEMINI_MODEL = 'gemini-flash-latest'

// If the primary model is overloaded (HTTP 503 "high demand") or rate-limited,
// the app automatically retries and then tries these fallbacks in order.
export const GEMINI_FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash']
