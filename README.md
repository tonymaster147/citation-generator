# Assignments4u — Citation Generator (React + Gemini, no backend)

A frontend-only citation generator. Pick a style, paste a URL/DOI/title (or fill
fields manually), and Gemini formats the citation. History is saved in the
browser's localStorage.

## Run locally

```bash
npm install
npm run dev      # opens http://localhost:5173
```

## Build for production

```bash
npm run build    # output in dist/
npm run preview  # preview the built site
```

Deploy the `dist/` folder to any static host (Netlify, Vercel, Cloudflare Pages,
or your existing web server). If you serve it under a sub-path like
`/tools/citation/`, set `base: '/tools/citation/'` in `vite.config.js`.

## Configuration

Everything lives in [`src/config.js`](src/config.js):

- `GEMINI_API_KEY` — your key. You can also set it via a `.env` file:
  ```
  VITE_GEMINI_API_KEY=your_key_here
  ```
- `GEMINI_MODEL` — defaults to `gemini-flash-latest` (free-tier friendly, always
  points at the current Flash model). Alternatives: `gemini-2.0-flash`,
  `gemini-2.5-flash`.

## ⚠️ Important: API key security

Because there is **no backend**, the API key is bundled into the public
JavaScript and **anyone can read it** and use your free quota. Before going
live, do at least one of these:

1. **Restrict the key** in Google Cloud / AI Studio:
   - Application restriction → HTTP referrers → `https://www.assignments4u.com/*`
   - API restriction → allow only "Generative Language API"
2. For real protection, add a tiny serverless proxy (Cloudflare Worker / Vercel
   Function / Netlify Function) that holds the key server-side and forwards
   requests. Then point `ENDPOINT` in `src/services/gemini.js` at the proxy and
   remove the key from the frontend.

The free tier also has rate limits — heavy public traffic can exhaust the quota
(you'll see a "Rate limit reached" message). A paid key or proxy avoids this.

## Project structure

```
src/
  config.js                 API key + model
  App.jsx                   main page + state + history
  services/gemini.js        Gemini REST call + JSON parsing
  data/styles.js            citation styles, source types, languages
  components/
    StyleDropdown.jsx       searchable style picker
    Preferences.jsx         source type + language
    ManualForm.jsx          manual field entry
    CitationCard.jsx        result / history item + copy
  styles.css                Assignments4u-themed styling
```

## Notes

- Citations are AI-generated and should be verified against the source and the
  official style guide (there's a disclaimer in the UI).
- Italics from the model come back as `<i>…</i>` and are safely rendered
  (all other HTML is escaped).
