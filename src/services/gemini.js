import {
  GEMINI_API_KEYS,
  GEMINI_MODEL,
  GEMINI_FALLBACK_MODELS,
} from '../config.js'

const ENDPOINT = (model, key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Rotates which key we try FIRST on each call, so load spreads across all keys.
let keyRotation = 0

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

/**
 * Search for candidate sources matching a title/keyword (no backend — Gemini
 * suggests likely-matching works). Returns [{title, authors, year, type}].
 */
export async function searchSources({ query, language = 'English' }) {
  const prompt = `You are an academic source finder. The user is searching for sources related to:
"""${query}"""

List up to 8 distinct, plausible academic sources whose title or topic matches this query.
Include a MIX of types: journal articles, books, book chapters, conference papers, and websites.
Prefer well-known / real works when you are confident; otherwise provide representative
examples of the kind of source that matches. Keep author lists short (e.g. "Smith J, Lee A").
Write in ${language}.

Return ONLY minified JSON, no markdown fences, with exactly this shape:
{"results":[{"title": string, "authors": string, "year": string, "type": string}]}
Where "type" is one of: "Journal article", "Book", "Book chapter", "Conference paper", "Website", "Report", "Thesis / Dissertation".`

  const results = await runGemini(prompt, parseSearch)
  return results
}

/**
 * Produce a citation as strict JSON.
 * Automatically retries transient failures and falls back to other models.
 */
export async function generateCitation(opts) {
  const {
    styleLabel,
    sourceType,
    language = 'English',
    mode,
    query = '',
    fields = {},
  } = opts

  const sourceBlock =
    mode === 'manual'
      ? `The user provided these source details (JSON):\n${JSON.stringify(
          fields,
          null,
          2
        )}`
      : `The user provided this raw input (a URL, DOI, title, or a paste of source info):\n"""${query}"""\n` +
        `If it is a URL or DOI, infer the bibliographic details from your knowledge. ` +
        `If a real-world detail is genuinely unknown, use a sensible placeholder like "n.d." for dates or "[author]" and note it.`

  const typeLine = sourceType
    ? `The source type is: ${sourceType}.`
    : `Infer the most likely source type.`

  const prompt = `You are an expert academic citation formatter. Produce a citation in ${styleLabel} style, written in ${language}.
${typeLine}
${sourceBlock}

Rules:
- Follow ${styleLabel} rules EXACTLY (punctuation, italics markers, capitalization, ordering, "et al." rules, page/volume/issue formatting, DOIs/URLs).
- For italics, wrap the italic part in <i>...</i> so it can be rendered.
- Do NOT invent DOIs or URLs that you are not confident about; omit them instead.
- "reference" = the full reference-list / bibliography entry.
- "inText" = the in-text citation (or footnote form for note styles).
- "notes" = a short note ONLY if you made an assumption or a field was missing; otherwise "".

Return ONLY minified JSON, no markdown fences, with exactly these keys:
{"reference": string, "inText": string, "type": string, "notes": string}`

  return runGemini(prompt, parseCitation)
}

// ---------------------------------------------------------------------------
// SHARED ENGINE: model fallback + retry with backoff
// ---------------------------------------------------------------------------

async function runGemini(prompt, parseFn) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.25, responseMimeType: 'application/json' },
  }

  if (GEMINI_API_KEYS.length === 0)
    throw new Error(
      'No Gemini API key configured. Set VITE_GEMINI_API_KEY in your .env / build secret.'
    )

  const models = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS]

  // Order the keys starting from a rotating offset (spreads first-try load).
  const n = GEMINI_API_KEYS.length
  const start = keyRotation++ % n
  const keys = Array.from({ length: n }, (_, i) => GEMINI_API_KEYS[(start + i) % n])

  let lastError = null

  keyLoop: for (let k = 0; k < keys.length; k++) {
    const key = keys[k]
    for (let m = 0; m < models.length; m++) {
      const model = models[m]
      const maxAttempts = 3
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await callModel(key, model, body, parseFn)
        } catch (err) {
          lastError = err
          // Blocked content etc. → truly fatal, stop everything.
          if (!err.retryable && !err.nextKey) throw err
          // Bad / unauthorized key → skip its models, jump to the next key.
          if (err.nextKey) continue keyLoop
          // 404 (model gone) / 429 (rate limited) → try the next model, which has
          // its own quota bucket. When all models on this key are exhausted, the
          // outer loop moves on to the next KEY (fresh quota).
          if (err.nextModel) break
          // 503 / 500 / network / parse hiccup → retry same model with backoff.
          if (attempt < maxAttempts) await sleep(700 * attempt)
        }
      }
    }
  }

  throw new Error(
    lastError?.friendly ||
      'The service is busy right now. Please try again in a few seconds.'
  )
}

async function callModel(key, model, body, parseFn) {
  let res
  try {
    res = await fetch(ENDPOINT(model, key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw makeError('Network error — please check your internet connection.', {
      retryable: true,
    })
  }

  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.json())?.error?.message || ''
    } catch {}

    if (res.status === 400 && /API key/i.test(detail))
      // Invalid key → try the next key rather than failing the whole request.
      throw makeError('Invalid API key.', {
        nextKey: true,
        friendly: 'API key is invalid. Check your VITE_GEMINI_API_KEY configuration.',
      })
    if (res.status === 403)
      throw makeError('API key not authorized.', {
        nextKey: true,
        friendly:
          'API key is not authorized (check the key restrictions in Google Cloud).',
      })
    if (res.status === 429)
      // Rate limited → skip retries on this model, try the next one immediately.
      throw makeError('rate limited', {
        retryable: true,
        status: 429,
        nextModel: true,
        friendly:
          'You’ve hit the free usage limit for the moment. Please wait ~30 seconds and try again.',
      })
    if (res.status === 503 || res.status === 500)
      throw makeError('busy', {
        retryable: true,
        status: res.status,
        friendly:
          'The service is busy right now. Please try again in a few seconds.',
      })
    if (res.status === 404)
      throw makeError('model missing', { retryable: true, status: 404, nextModel: true })

    throw makeError(detail || `Request failed (HTTP ${res.status}).`, {
      retryable: false,
    })
  }

  const data = await res.json()
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''

  if (!text) {
    const blocked = data?.promptFeedback?.blockReason
    if (blocked)
      throw makeError(
        'That request was blocked by the content filter. Try rephrasing.',
        { retryable: false }
      )
    throw makeError('Empty response — retrying.', { retryable: true })
  }

  return parseFn(text) // may throw a retryable error on bad JSON
}

// ---------------------------------------------------------------------------
// PARSERS
// ---------------------------------------------------------------------------

function parseCitation(text) {
  const parsed = safeParse(text)
  if (!parsed || !parsed.reference)
    throw makeError('Could not read the citation — retrying.', { retryable: true })
  return {
    reference: String(parsed.reference).trim(),
    inText: String(parsed.inText || '').trim(),
    type: String(parsed.type || '').trim(),
    notes: String(parsed.notes || '').trim(),
  }
}

function parseSearch(text) {
  const parsed = safeParse(text)
  const arr = Array.isArray(parsed) ? parsed : parsed?.results
  if (!Array.isArray(arr))
    throw makeError('Could not read search results — retrying.', { retryable: true })
  return arr
    .filter((r) => r && r.title)
    .slice(0, 8)
    .map((r) => ({
      title: String(r.title).trim(),
      authors: String(r.authors || '').trim(),
      year: String(r.year || '').trim(),
      type: normalizeType(r.type),
    }))
}

// Map whatever Gemini returns (any casing) to a canonical label.
function normalizeType(raw) {
  const t = String(raw || '').toLowerCase()
  if (t.includes('book chapter') || t.includes('chapter')) return 'Book chapter'
  if (t.includes('book')) return 'Book'
  if (t.includes('journal')) return 'Journal article'
  if (t.includes('conference') || t.includes('proceeding')) return 'Conference paper'
  if (t.includes('thesis') || t.includes('dissertation')) return 'Thesis / Dissertation'
  if (t.includes('report')) return 'Report'
  if (t.includes('news')) return 'Newspaper article'
  if (t.includes('magazine')) return 'Magazine article'
  if (t.includes('web') || t.includes('site') || t.includes('online')) return 'Website'
  if (!raw) return 'Source'
  return String(raw).charAt(0).toUpperCase() + String(raw).slice(1)
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function makeError(
  message,
  {
    retryable = false,
    status = null,
    friendly = null,
    nextModel = false,
    nextKey = false,
  } = {}
) {
  const e = new Error(message)
  e.retryable = retryable
  e.status = status
  e.friendly = friendly
  e.nextModel = nextModel
  e.nextKey = nextKey
  return e
}

function safeParse(text) {
  try {
    return JSON.parse(text)
  } catch {}
  const cleaned = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {}
  const match = cleaned.match(/[[{][\s\S]*[\]}]/)
  if (match) {
    try {
      return JSON.parse(match[0])
    } catch {}
  }
  return null
}
