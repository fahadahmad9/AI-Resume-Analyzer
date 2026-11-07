import { Clipboard } from 'lucide-react'
import { useState } from 'react'
import Accordion from '../components/ui/Accordion'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { useResume } from '../context/useResume'
import { formatDateRange, itemBullets, itemText } from '../utils/formatters'

function TimelineCard({ title, items }) {
  const list = Array.isArray(items) ? items : []
  return <Card className="timeline-section"><h2>{title}</h2>{list.length ? <div className="timeline-list">{list.map((item, index) => <article className="timeline-item" key={`${itemText(item)}-${index}`}><span className="timeline-dot" /><div><div className="timeline-heading"><h3>{itemText(item) || title}</h3><span>{formatDateRange(item)}</span></div>{typeof item === 'object' && (item.organization || item.company || item.stack) ? <p className="timeline-subtitle">{item.organization || item.company || item.stack}</p> : null}{itemBullets(item).length ? <ul>{itemBullets(item).map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : typeof item === 'string' ? null : <p>{item.description || ''}</p>}</div></article>)}</div> : <EmptyState title={`No ${title.toLowerCase()} extracted`} description="No entries were returned for this section." />}</Card>
}

function DetailsPage() {
  const { result } = useResume()
  const [copied, setCopied] = useState(false)
  const resume = result?.structured || {}
  const rawText = result?.preview || result?.rawText || result?.text || ''
  const copyText = async () => { try { await navigator.clipboard.writeText(rawText); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch { setCopied(false) } }
  return <section className="results-page"><div className="page-intro"><span className="eyebrow">Resume details</span><h1>The details behind your score</h1><p>Review the content extracted from your resume.</p></div><Card className="summary-card"><h2>Summary</h2><p>{resume.summary || 'No extracted summary content.'}</p></Card><TimelineCard title="Education" items={resume.education} /><TimelineCard title="Experience" items={resume.experience} /><TimelineCard title="Projects" items={resume.projects} /><Accordion title="Raw extracted text"><div className="raw-toolbar"><span>Source text from the uploaded PDF</span><button className="button button-secondary button-small" type="button" onClick={copyText} disabled={!rawText}><Clipboard size={15} />{copied ? 'Copied' : 'Copy'}</button></div><pre className="raw-text">{rawText || 'Raw extracted text is unavailable.'}</pre></Accordion></section>
}

export default DetailsPage
