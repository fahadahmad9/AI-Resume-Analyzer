import { useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Chip from '../components/ui/Chip'
import ErrorBanner from '../components/ui/ErrorBanner'
import ScoreRing from '../components/ui/ScoreRing'
import ProgressBar from '../components/ui/ProgressBar'
import Accordion from '../components/ui/Accordion'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/ui/Skeleton'
import { useResume } from '../context/useResume'

function verdictLabel(score) {
  if (score >= 85) return 'Strong match'
  if (score >= 65) return 'Good match'
  if (score >= 40) return 'Partial match'
  return 'Weak match'
}

function importanceTone(value) {
  return value === 'must' ? 'must' : 'nice'
}

function Evidence({ item }) {
  const evidence = Array.isArray(item.evidenceAll) && item.evidenceAll.length
    ? item.evidenceAll
    : item.evidence ? [item.evidence] : []
  if (!evidence.length) return null
  return <Accordion title={`View evidence (${evidence.length})`}><div className="evidence-list">{evidence.map((entry, index) => <div className="evidence-entry" key={`${entry.section || entry.type || 'evidence'}-${index}`}><strong>{entry.section || entry.type || 'Resume'}</strong>{entry.title ? <span>{entry.title}</span> : null}<p>{entry.content || entry.snippet || entry.text || 'Evidence found in resume.'}</p></div>)}</div></Accordion>
}

function RequirementCard({ item }) {
  const verdict = item.verdict || (item.matchedBy ? 'met' : 'missing')
  return <article className="requirement-card"><div className="requirement-top"><strong>{item.requirement || 'Unnamed requirement'}</strong><div><Badge tone={importanceTone(item.importance)}>{item.importance === 'must' ? 'Must-have' : 'Nice-to-have'}</Badge><Badge tone={verdict}>{verdict}</Badge></div></div>{item.reason ? <p>{item.reason}</p> : null}<div className="requirement-meta">{item.matchedBy ? <Chip tone="info">Matched by {item.matchedBy}</Chip> : null}{item.supportingTerm ? <Chip tone="success">{item.supportingTerm}</Chip> : null}{item.similarity !== undefined ? <span>{Math.round(Number(item.similarity) * 100)}% similarity</span> : null}</div>{item.downgraded ? <small className="downgraded-note">Evidence not found in resume text.</small> : null}<Evidence item={item} /></article>
}

function MatchGroup({ title, items, explanation }) {
  return   <section className="match-group"><div className="group-heading"><div><h2>{title}</h2>{explanation ? <p>{explanation}</p> : null}</div><span>{items.length}</span></div>{items.length ? items.map((item, index) => <RequirementCard item={item} key={`${item.requirement}-${index}`} />) : <EmptyState title={`No ${title.toLowerCase()} requirements`} description="Nothing was returned in this group." />}</section>
}

function MatchSkeleton() {
  return <div className="match-loading"><Card className="match-summary-skeleton"><Skeleton className="skeleton-ring" /><div><Skeleton className="skeleton-line wide" /><Skeleton className="skeleton-line" /></div></Card><div className="skeleton-columns"><Skeleton className="skeleton-block" /><Skeleton className="skeleton-block" /></div><p className="loading-copy">Comparing your resume with the job description...</p></div>
}

function MatchPage() {
  const { resumeId, jd, matchStatus, matchResult, matchError, runMatch, resetMatch, reset } = useResume()
  const [draft, setDraft] = useState(jd)
  const [editing, setEditing] = useState(!matchResult)
  const canCompare = draft.trim().length >= 50

  const submit = async (event) => {
    event.preventDefault()
    if (!canCompare || matchStatus === 'matching') return
    const result = await runMatch(draft)
    if (result) setEditing(false)
  }
  const compareAnother = () => { resetMatch(); setDraft(''); setEditing(true) }
  const editDescription = () => { setDraft(jd); setEditing(true) }

  if (!resumeId) return <section className="results-page"><div className="page-intro"><span className="eyebrow">Job match</span><h1>Compare with a job</h1></div><Card className="unavailable-card"><div className="placeholder-icon">?</div><h2>Comparison unavailable</h2><p>This resume was not indexed for matching. Start over and upload it again to enable job comparisons.</p><Button className="button-primary" onClick={reset}>Start over</Button></Card></section>
  if (matchStatus === 'matching') return <section className="results-page"><div className="page-intro"><span className="eyebrow">Job match</span><h1>Compare your fit</h1></div><MatchSkeleton /></section>

  if (editing || !matchResult) return <section className="results-page"><div className="page-intro"><span className="eyebrow">Job match</span><h1>Compare your fit</h1><p>Paste a job description to see which requirements your resume supports.</p></div><Card className="jd-card"><form onSubmit={submit}><label htmlFor="job-description">Job description</label><textarea id="job-description" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Paste the full job description here. Include responsibilities, qualifications, and required skills for the clearest comparison." rows="12" /><div className="jd-footer"><span className={draft.trim().length < 50 ? 'counter-warning' : ''}>{draft.length} characters{draft.trim().length < 50 ? ' · 50 minimum' : ''}</span><Button className="button-primary" disabled={!canCompare} type="submit">Compare</Button></div><p className="helper-text">Your job description is compared against the indexed resume evidence.</p></form>{matchError ? <ErrorBanner>{matchError}</ErrorBanner> : null}</Card></section>

  const score = Number(matchResult.score)
  const matched = Array.isArray(matchResult.matched) ? matchResult.matched : []
  const partial = Array.isArray(matchResult.partial) ? matchResult.partial : []
  const missing = [...(Array.isArray(matchResult.missing) ? matchResult.missing : [])].sort((a, b) => (b.importance === 'must' ? 1 : 0) - (a.importance === 'must' ? 1 : 0))
  const notAssessed = Array.isArray(matchResult.notAssessed) ? matchResult.notAssessed : []
  const breakdown = matchResult.scoreBreakdown || {}
  const getBreakdown = (key) => breakdown[key]?.score ?? breakdown[key] ?? null
  return <section className="results-page"><div className="page-intro"><span className="eyebrow">Job match</span><h1>Your match results</h1><p>Evidence-backed comparison for the job description you provided.</p></div><Card className="match-summary"><ScoreRing score={matchResult.score} label="Match score" /><div className="match-summary-details"><span className="eyebrow">{verdictLabel(score)}</span><h2>{Math.round(score) || 0}<small>/100 match score</small></h2><div className="match-counts"><span><strong>{matched.length}</strong> Met</span><span><strong>{partial.length}</strong> Partial</span><span><strong>{missing.length}</strong> Missing</span></div></div><div className="coverage-bars"><ProgressBar label="Must-have coverage" score={getBreakdown('mustHave') ?? getBreakdown('must')} /><ProgressBar label="Nice-to-have coverage" score={getBreakdown('niceToHave') ?? getBreakdown('nice')} /></div></Card>{matchResult.judge === 'fallback' ? <div className="info-banner">The AI judge was unavailable, so similarity rules were used for this comparison.</div> : null}<div className="match-actions"><Button className="button-secondary" onClick={compareAnother}>Compare another job description</Button><Button className="button-secondary" onClick={editDescription}>Edit job description</Button></div><div className="match-groups"><MatchGroup title="Met" items={matched} /><MatchGroup title="Partial" items={partial} /><MatchGroup title="Missing" items={missing} /><MatchGroup title="Not assessed from resume" items={notAssessed} explanation="These soft-skill requirements could not be reliably verified from resume text." /></div></section>
}

export default MatchPage
