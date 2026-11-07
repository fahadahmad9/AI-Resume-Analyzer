import { createElement } from 'react'
import { Github, Linkedin, Mail, Phone } from 'lucide-react'
import Card from '../components/ui/Card'
import ScoreRing from '../components/ui/ScoreRing'
import ProgressBar from '../components/ui/ProgressBar'
import Badge from '../components/ui/Badge'
import Accordion from '../components/ui/Accordion'
import EmptyState from '../components/ui/EmptyState'
import { useResume } from '../context/useResume'
import { humanizeKey } from '../utils/formatters'

function ContactLink({ icon: Icon, value, href }) {
  if (!value) return null
  return <a className="contact-link" href={href || `mailto:${value}`} target={href ? '_blank' : undefined} rel={href ? 'noreferrer' : undefined}>{createElement(Icon, { size: 15 })}{value}</a>
}

function InsightCard({ title, items, tone }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : []
  return <Card className={`insight-card insight-${tone}`}><h2>{title}</h2>{list.length ? <ol>{list.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol> : <EmptyState title={`No ${title.toLowerCase()} detected`} description="This section was not included in the response." />}</Card>
}

function OverviewPage() {
  const { result } = useResume()
  const resume = result?.structured || {}
  const analysis = result?.aiAnalysis || {}
  const score = resume.score || {}
  const metrics = Object.entries(analysis.qualityDimensions || {}).filter(([, metric]) => metric && (metric.score !== null && metric.score !== undefined))
  const scoreUnavailable = !metrics.length && (score.total === null || score.total === undefined)
  const profileLinks = resume.socialLinks || {}
  const detectedProfiles = (resume.profiles?.linkedin?.length || 0) + (resume.profiles?.github?.length || 0) > 0

  return <section className="results-page"><div className="page-intro"><span className="eyebrow">Resume overview</span><h1>{resume.name || 'Your resume overview'}</h1><p>Understand what is working and where your application can improve.</p></div>
    <Card className="overview-hero"><ScoreRing score={score.total} label="Resume score" /><div className="hero-details"><div><span className="eyebrow">Resume score</span><h2>{resume.name || 'Candidate profile'}</h2></div><div className="contact-row"><ContactLink icon={Mail} value={resume.email} /><ContactLink icon={Phone} value={resume.phone} /><ContactLink icon={Linkedin} value={profileLinks.linkedin} href={profileLinks.linkedin} /><ContactLink icon={Github} value={profileLinks.github} href={profileLinks.github} /></div><div className="hero-meta"><Badge tone={detectedProfiles ? 'success' : 'info'}>{detectedProfiles ? 'Detected profiles' : 'No profiles detected'}</Badge><span>{result?.pageCount ? `${result.pageCount} page${result.pageCount === 1 ? '' : 's'}` : 'Page count unavailable'}</span></div></div></Card>
    {scoreUnavailable ? <div className="info-banner">AI metric scores were not available for this response. The extracted resume information is still shown below.</div> : null}
    <section className="metric-grid" aria-label="AI resume metrics">{metrics.length ? metrics.map(([key, metric]) => <Card className="metric-card" key={key}><ProgressBar label={humanizeKey(key)} score={metric.score} /><ul>{(metric.findings || []).slice(0, 1).map((finding) => <li key={finding}>{finding}</li>)}</ul>{metric.findings?.length > 1 ? <Accordion title={`View ${metric.findings.length - 1} more finding${metric.findings.length > 2 ? 's' : ''}`}><ul>{metric.findings.slice(1).map((finding) => <li key={finding}>{finding}</li>)}</ul></Accordion> : null}</Card>) : <Card className="full-card"><EmptyState title="AI metrics are unavailable" description="No metric scores were returned, but the rest of your resume analysis remains available." /></Card>}</section>
    <section className="insight-grid"><InsightCard title="Strengths" items={analysis.overallStrengths || score.strengths} tone="success" /><InsightCard title="Weaknesses" items={analysis.overallWeaknesses || score.weaknesses} tone="warning" /><InsightCard title="Priority improvements" items={analysis.priorityImprovements} tone="primary" numbered /></section>
  </section>
}

export default OverviewPage
