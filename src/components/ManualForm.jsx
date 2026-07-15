const FIELD_DEFS = [
  { key: 'authors', label: 'Author(s)', placeholder: 'Smith, J.; Chen, L.', full: true },
  { key: 'title', label: 'Title of source', placeholder: 'Kubla Khan: A Study in Romanticism', full: true },
  { key: 'containerTitle', label: 'Journal / Website / Book title', placeholder: 'Journal of Romantic Studies' },
  { key: 'publisher', label: 'Publisher', placeholder: 'Oxford University Press' },
  { key: 'year', label: 'Year', placeholder: '2015' },
  { key: 'edition', label: 'Edition', placeholder: '2nd' },
  { key: 'volume', label: 'Volume', placeholder: '21' },
  { key: 'issue', label: 'Issue', placeholder: '3' },
  { key: 'pages', label: 'Pages', placeholder: '245-260' },
  { key: 'url', label: 'URL', placeholder: 'https://…' },
  { key: 'doi', label: 'DOI', placeholder: '10.1080/…' },
  { key: 'accessDate', label: 'Date accessed', placeholder: '2026-07-15' },
]

export default function ManualForm({ fields, setFields, sourceTypeLabel }) {
  function update(key, val) {
    setFields((f) => ({ ...f, [key]: val }))
  }
  return (
    <div className="manual">
      {sourceTypeLabel && (
        <p className="manual-note">
          Citing a <strong>{sourceTypeLabel}</strong> — change this under
          Preferences. Leave fields blank if they don't apply.
        </p>
      )}
      <div className="manual-grid">
        {FIELD_DEFS.map((f) => (
          <div className={`manual-field ${f.full ? 'full' : ''}`} key={f.key}>
            <label>{f.label}</label>
            <input
              value={fields[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => update(f.key, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
