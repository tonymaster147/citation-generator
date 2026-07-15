import { useEffect, useMemo, useRef, useState } from 'react'

export default function StyleDropdown({ styles, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef = useRef(null)

  const current = styles.find((s) => s.id === value)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return styles
    return styles.filter((s) => s.label.toLowerCase().includes(q))
  }, [styles, search])

  useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="dd" ref={wrapRef}>
      <button
        className="dd-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{current?.label || 'Select style'}</span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" className={open ? 'flip' : ''}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="dd-menu" role="listbox">
          <div className="dd-search">
            <input
              autoFocus
              placeholder="Search source style…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="dd-options">
            {filtered.length === 0 && <div className="dd-empty">No styles found</div>}
            {filtered.map((s) => (
              <button
                key={s.id}
                role="option"
                aria-selected={s.id === value}
                className={`dd-option ${s.id === value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(s.id)
                  setOpen(false)
                  setSearch('')
                }}
              >
                {s.label}
                {s.id === value && <CheckIcon />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
