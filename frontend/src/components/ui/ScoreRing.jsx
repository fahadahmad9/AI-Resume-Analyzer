import { clampScore, scoreBand } from '../../utils/formatters'

function ScoreRing({ score, size = 132, label = 'Score' }) {
  const value = clampScore(score)
  const band = scoreBand(value)
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const offset = value === null ? circumference : circumference - (value / 100) * circumference

  return <div className={`score-ring score-ring-${band}`} style={{ '--ring-size': `${size}px` }} aria-label={`${label}: ${value === null ? 'not available' : `${Math.round(value)} out of 100`}`}>
    <svg viewBox="0 0 112 112" aria-hidden="true"><circle className="score-ring-track" cx="56" cy="56" r={radius} /><circle className="score-ring-value" cx="56" cy="56" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} /></svg>
    <span><strong>{value === null ? 'N/A' : Math.round(value)}</strong>{value === null ? null : <small>/100</small>}</span>
  </div>
}

export default ScoreRing
