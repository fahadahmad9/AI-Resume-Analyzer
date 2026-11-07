import { clampScore, scoreBand } from '../../utils/formatters'

function ProgressBar({ label, score, suffix = '/100' }) {
  const value = clampScore(score)
  return <div className={`progress-item progress-${scoreBand(value)}`}><div className="progress-label"><span>{label}</span><strong>{value === null ? 'N/A' : `${Math.round(value)}${suffix}`}</strong></div><div className="progress-track"><span style={{ width: `${value ?? 0}%` }} /></div></div>
}

export default ProgressBar
