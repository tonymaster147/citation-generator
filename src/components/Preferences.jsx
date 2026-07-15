export default function Preferences({
  sourceType,
  setSourceType,
  language,
  setLanguage,
  sourceTypes,
  languages,
}) {
  return (
    <div className="prefs">
      <div className="pref-field">
        <label>Source type</label>
        <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
          {sourceTypes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="pref-field">
        <label>Language</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
