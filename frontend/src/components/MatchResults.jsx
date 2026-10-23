function formatImportance(importance) {
  return importance === 'must' ? 'must' : 'nice'
}

function formatSimilarity(value) {
  return `${Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100)}%`
}

function MatchItemBadge({ importance }) {
  const label = formatImportance(importance)

  return <span className={`match-importance match-importance-${label}`}>{label}</span>
}

function EvidenceSnippet({ evidence }) {
  if (!evidence) {
    return null
  }

  const content = String(evidence.content || '')
  const isTruncated = content.length > 160
  const snippet = isTruncated ? `${content.slice(0, 160).trim()}...` : content

  return (
    <div className="match-evidence">
      <p>
        <strong>{evidence.section || 'Resume'}</strong>
        {' - '}
        {snippet}
      </p>
      {isTruncated ? (
        <details>
          <summary>View full evidence</summary>
          <p className="match-evidence-full">{content}</p>
        </details>
      ) : null}
    </div>
  )
}

function MatchResults({ results, onCompareAnother }) {
  const score = Math.max(0, Math.min(100, Number(results.score) || 0))
  const scoreBand = score < 40 ? 'red' : score < 70 ? 'amber' : 'green'
  const matched = Array.isArray(results.matched) ? results.matched : []
  const missing = Array.isArray(results.missing)
    ? [...results.missing].sort((a, b) => (
      (formatImportance(b.importance) === 'must' ? 1 : 0)
      - (formatImportance(a.importance) === 'must' ? 1 : 0)
    ))
    : []

  return (
    <section className="match-results" aria-live="polite">
      <div className="match-results-header">
        <div>
          <h3>Match results</h3>
          <div className={`match-score match-score-${scoreBand}`}>
            <strong>{score}</strong>
            <span>/ 100</span>
          </div>
        </div>
        <button type="button" className="match-secondary-button" onClick={onCompareAnother}>
          Compare another JD
        </button>
      </div>

      <div className={`match-progress match-progress-${scoreBand}`} aria-label={`Match score: ${score}%`}>
        <div className="match-progress-fill" style={{ width: `${score}%` }} />
      </div>

      <div className="match-lists">
        <section className="match-list">
          <h4>Matched ({matched.length})</h4>
          {matched.length ? (
            matched.map((item, index) => (
              <article className="match-item" key={`${item.requirement}-${index}`}>
                <div className="match-item-header">
                  <strong>{item.requirement}</strong>
                  <span className="match-similarity">{formatSimilarity(item.similarity)}</span>
                </div>
                <MatchItemBadge importance={item.importance} />
                <EvidenceSnippet evidence={item.evidence} />
              </article>
            ))
          ) : (
            <p className="resume-empty">No requirements met the match threshold.</p>
          )}
        </section>

        <section className="match-list">
          <h4>Missing ({missing.length})</h4>
          {missing.length ? (
            missing.map((item, index) => (
              <article className="match-item match-item-missing" key={`${item.requirement}-${index}`}>
                <div className="match-item-header">
                  <strong>{item.requirement}</strong>
                  <MatchItemBadge importance={item.importance} />
                </div>
              </article>
            ))
          ) : (
            <p className="resume-empty">No missing requirements found.</p>
          )}
        </section>
      </div>
    </section>
  )
}

export default MatchResults
