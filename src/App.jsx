import { useEffect, useMemo, useRef, useState } from 'react'
import { CITATION_STYLES, SOURCE_TYPES, LANGUAGES } from './data/styles.js'
import { generateCitation, searchSources } from './services/gemini.js'
import StyleDropdown from './components/StyleDropdown.jsx'
import ManualForm from './components/ManualForm.jsx'
import CitationCard from './components/CitationCard.jsx'
import Preferences from './components/Preferences.jsx'

const LS_KEY = 'a4u_citation_history_v1'

const EMPTY_FIELDS = {
  authors: '',
  title: '',
  containerTitle: '', // journal / website / book title
  publisher: '',
  year: '',
  volume: '',
  issue: '',
  pages: '',
  edition: '',
  url: '',
  doi: '',
  accessDate: '',
}

export default function App() {
  const [styleId, setStyleId] = useState('apa7')
  const [sourceType, setSourceType] = useState('website')
  const [language, setLanguage] = useState('English')

  const [mode, setMode] = useState('auto') // 'auto' | 'manual'
  const [query, setQuery] = useState('')
  const [fields, setFields] = useState(EMPTY_FIELDS)

  const [showPrefs, setShowPrefs] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  // Source-search (matching results) state
  const [searching, setSearching] = useState(false)
  const [candidates, setCandidates] = useState(null) // null = not searched yet
  const [searchTab, setSearchTab] = useState('sources')
  const [citingId, setCitingId] = useState(null) // which candidate is being cited

  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) || []
    } catch {
      return []
    }
  })

  const idCounter = useRef(0)

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(history))
  }, [history])

  const styleLabel = useMemo(
    () => CITATION_STYLES.find((s) => s.id === styleId)?.label || styleId,
    [styleId]
  )
  const sourceTypeLabel = useMemo(
    () => SOURCE_TYPES.find((s) => s.id === sourceType)?.label || '',
    [sourceType]
  )

  const isLink = isUrlOrDoi(query)
  const canSubmit =
    mode === 'auto'
      ? query.trim().length > 0
      : fields.title.trim().length > 0 || fields.authors.trim().length > 0

  // Auto-mode primary button: a link → cite directly; plain text → search first.
  function handleAutoSubmit() {
    if (mode === 'manual') return runCite({ mode: 'manual' })
    if (isLink) return runCite({ mode: 'auto', query, title: query.slice(0, 120) })
    return handleSearch()
  }

  async function handleSearch() {
    const q = query.trim()
    if (!q || searching) return
    setSearching(true)
    setError('')
    setResult(null)
    setCandidates(null)
    try {
      const results = await searchSources({ query: q, language })
      setCandidates(results)
      setSearchTab('sources')
    } catch (e) {
      setError(e.message || 'Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  // Build a rich query string from a chosen candidate, then cite it.
  function citeCandidate(item) {
    const q = [item.authors, item.title, item.year, item.type]
      .filter(Boolean)
      .join('. ')
    runCite({
      mode: 'auto',
      query: q,
      title: item.title,
      sourceType: item.type,
      candidateId: item.title + item.year,
    })
  }

  async function runCite({ mode: m, query: q = '', title, sourceType: st, candidateId }) {
    if (loading) return
    setLoading(true)
    setCitingId(candidateId || null)
    setError('')
    setResult(null)
    try {
      const citation = await generateCitation({
        styleLabel,
        sourceType: st || sourceTypeLabel,
        language,
        mode: m,
        query: q,
        fields,
      })
      const entry = {
        id: `${Date.now()}-${idCounter.current++}`,
        styleLabel,
        title:
          title ||
          (m === 'manual'
            ? fields.title || fields.authors || 'Untitled source'
            : q.slice(0, 120)),
        ...citation,
      }
      setResult(entry)
      setHistory((h) => [entry, ...h].slice(0, 50))
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
      setCitingId(null)
    }
  }

  function onQueryChange(v) {
    setQuery(v)
    if (candidates) setCandidates(null) // stale results once the query changes
  }

  // Split candidates into Sources vs Books tabs (like the reference tool).
  const bookTypes = ['Book', 'Book chapter']
  const books = (candidates || []).filter((c) => bookTypes.includes(c.type))
  const sources = (candidates || []).filter((c) => !bookTypes.includes(c.type))
  const shown = searchTab === 'books' ? books : sources

  function removeFromHistory(id) {
    setHistory((h) => h.filter((e) => e.id !== id))
  }

  function copyAll() {
    const text = history.map((e) => stripTags(e.reference)).join('\n\n')
    navigator.clipboard?.writeText(text)
  }

  return (
    <div className="page">
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href="https://www.assignments4u.com/" aria-label="Assignments4u home">
            <BrandLogo />
          </a>
          <div className="header-contact">
            <a className="contact-email" href="mailto:info@assignments4u.com">
              <MailIcon />
              <span>info@assignments4u.com</span>
            </a>
            <a className="contact-phone" href="tel:+15597420021">
              <PhoneIcon />
              <span>+1-559-742-0021</span>
            </a>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <h1>Free Citation Generator</h1>
          <p>
            Create accurate citations for any source in APA, MLA, Chicago,
            Harvard and 12+ more styles. Powered by AI, formatted in seconds.
          </p>
        </div>
      </section>

      <main className="container main">
        <div className="tool-card">
          {/* Top row: style + preferences */}
          <div className="tool-toprow">
            <StyleDropdown
              styles={CITATION_STYLES}
              value={styleId}
              onChange={setStyleId}
            />
            <button
              className="btn ghost"
              onClick={() => setShowPrefs((v) => !v)}
              aria-expanded={showPrefs}
            >
              <GearIcon /> Preferences
            </button>
          </div>

          {showPrefs && (
            <Preferences
              sourceType={sourceType}
              setSourceType={setSourceType}
              language={language}
              setLanguage={setLanguage}
              sourceTypes={SOURCE_TYPES}
              languages={LANGUAGES}
            />
          )}

          {/* Mode tabs */}
          <div className="mode-tabs">
            <button
              className={`mode-tab ${mode === 'auto' ? 'active' : ''}`}
              onClick={() => {
                setMode('auto')
                setError('')
              }}
            >
              Search / paste URL · DOI
            </button>
            <button
              className={`mode-tab ${mode === 'manual' ? 'active' : ''}`}
              onClick={() => {
                setMode('manual')
                setCandidates(null)
                setError('')
              }}
            >
              Cite manually
            </button>
          </div>

          {/* Input */}
          {mode === 'auto' ? (
            <div className="search-wrap">
              <SearchIcon />
              <input
                className="search-input"
                placeholder="Search by title/keyword, or paste a URL or DOI…"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAutoSubmit()
                }}
              />
              {query && (
                <button className="clear-btn" onClick={() => onQueryChange('')} aria-label="Clear">
                  ×
                </button>
              )}
            </div>
          ) : (
            <ManualForm
              fields={fields}
              setFields={setFields}
              sourceTypeLabel={sourceTypeLabel}
            />
          )}

          <div className="action-row">
            <span className="hint">
              {mode === 'auto'
                ? isLink
                  ? 'Looks like a URL/DOI — we’ll cite it directly.'
                  : 'Type a title to see matching sources, or paste a URL/DOI to cite directly.'
                : 'Fill what you know — the AI handles the formatting.'}
            </span>
            <button
              className="btn primary"
              onClick={handleAutoSubmit}
              disabled={!canSubmit || loading || searching}
            >
              {searching ? (
                <Spinner />
              ) : mode === 'auto' && !isLink ? (
                'Search'
              ) : loading ? (
                <Spinner />
              ) : (
                'Cite'
              )}
            </button>
          </div>

          {error && <div className="alert error">{error}</div>}

          {/* Matching results (search) */}
          {mode === 'auto' && candidates && (
            <div className="results">
              <div className="results-tabs">
                <button
                  className={`results-tab ${searchTab === 'sources' ? 'active' : ''}`}
                  onClick={() => setSearchTab('sources')}
                >
                  <CapIcon /> Sources <span className="count">{sources.length}</span>
                </button>
                <button
                  className={`results-tab ${searchTab === 'books' ? 'active' : ''}`}
                  onClick={() => setSearchTab('books')}
                >
                  <BookIcon /> Books <span className="count">{books.length}</span>
                </button>
              </div>

              {candidates.length === 0 ? (
                <div className="results-empty">
                  No matches found. Try a more specific title, or paste a URL/DOI.
                </div>
              ) : shown.length === 0 ? (
                <div className="results-empty">
                  Nothing in this tab — check the other one.
                </div>
              ) : (
                <ul className="results-list">
                  {shown.map((item, i) => {
                    const cid = item.title + item.year
                    const isThisCiting = loading && citingId === cid
                    return (
                      <li key={i}>
                        <button
                          className="result-item"
                          onClick={() => citeCandidate(item)}
                          disabled={loading}
                        >
                          <span className="result-title">{item.title}</span>
                          <span className="result-meta">
                            {[item.type, item.year, item.authors]
                              .filter(Boolean)
                              .join('  ·  ')}
                          </span>
                          <span className="result-cite">
                            {isThisCiting ? 'Citing…' : 'Cite ›'}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <p className="results-note">
                AI-suggested matches — confirm the details are correct after citing.
              </p>
            </div>
          )}

          {result && <CitationCard entry={result} isResult />}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="history">
            <div className="history-head">
              <h2>History</h2>
              <div className="history-actions">
                <button className="link-btn" onClick={copyAll}>
                  Copy all
                </button>
                <button
                  className="link-btn danger"
                  onClick={() => setHistory([])}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="history-list">
              {history.map((entry) => (
                <CitationCard
                  key={entry.id}
                  entry={entry}
                  onRemove={() => removeFromHistory(entry.id)}
                />
              ))}
            </div>
          </div>
        )}

        <p className="disclaimer">
          AI-generated citations may occasionally contain errors — always
          double-check against your source and style guide.
        </p>
      </main>

      <footer className="site-footer">
        <div className="container">
          © {new Date().getFullYear()} Assignments4u · Citation Generator
        </div>
      </footer>
    </div>
  )
}

export function stripTags(s) {
  return String(s || '').replace(/<\/?i>/g, '')
}

// Treat input as a link (cite directly) when it looks like a URL or DOI.
function isUrlOrDoi(s) {
  const t = String(s || '').trim()
  return (
    /^https?:\/\//i.test(t) ||
    /^www\./i.test(t) ||
    /\b10\.\d{4,9}\/\S+/.test(t) || // DOI
    /^[\w-]+\.(com|org|net|edu|gov|io|co)\b/i.test(t)
  )
}

function CapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
      <path d="M12 4L2 9l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6 11v4c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
      <path d="M5 4h9a3 3 0 013 3v13H8a3 3 0 01-3-3V4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M5 4a2 2 0 00-2 2v11a3 3 0 013-3h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BrandLogo() {
  return (
    <img
      className="logo-img"
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt="Assignments4u"
    />
  )
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.24 11.4 11.4 0 003.6.58 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.4 11.4 0 00.58 3.6 1 1 0 01-.24 1l-2.24 2.2z" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg className="search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
function Spinner() {
  return <span className="spinner" aria-label="Loading" />
}
