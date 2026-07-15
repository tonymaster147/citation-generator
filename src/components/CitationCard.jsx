import { useState } from 'react'
import { stripTags } from '../App.jsx'

export default function CitationCard({ entry, isResult, onRemove }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard
      ?.writeText(stripTags(entry.reference))
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      })
      .catch(() => {})
  }

  return (
    <div className={`cite-card ${isResult ? 'result' : ''}`}>
      <div className="cite-card-head">
        <div>
          {entry.title && <h3 className="cite-title">{entry.title}</h3>}
          <span className="cite-badge">{entry.styleLabel}</span>
        </div>
        {onRemove && (
          <button className="icon-btn" onClick={onRemove} aria-label="Remove" title="Remove">
            ×
          </button>
        )}
      </div>

      <div className="cite-block">
        <span className="cite-label">Reference</span>
        <p
          className="cite-text"
          dangerouslySetInnerHTML={{ __html: sanitizeItalics(entry.reference) }}
        />
      </div>

      {entry.inText && (
        <div className="cite-block">
          <span className="cite-label">In-text</span>
          <p
            className="cite-text small"
            dangerouslySetInnerHTML={{ __html: sanitizeItalics(entry.inText) }}
          />
        </div>
      )}

      {entry.notes && <p className="cite-notes">ℹ️ {entry.notes}</p>}

      <div className="cite-actions">
        <button className="btn copy" onClick={copy}>
          {copied ? '✓ Copied' : 'Copy to clipboard'}
        </button>
      </div>
    </div>
  )
}

// Only allow <i></i> from the model output; escape everything else.
function sanitizeItalics(raw) {
  const escaped = String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped.replace(/&lt;i&gt;/g, '<i>').replace(/&lt;\/i&gt;/g, '</i>')
}
