import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { useResume } from '../context/useResume'

function AnalysisPage() {
  const { result } = useResume()
  const sectionAnalysis = result?.aiAnalysis?.sectionAnalysis || {}
  const sections = Array.isArray(sectionAnalysis.sections) ? sectionAnalysis.sections : []
  return <section className="results-page"><div className="page-intro"><span className="eyebrow">AI analysis</span><h1>How your resume reads</h1><p>Review section coverage and the context the AI used to evaluate your resume.</p></div>
    <Card className="analysis-context"><div><span>Domain</span><strong>{sectionAnalysis.domain || 'Not detected'}</strong></div><div><span>Resume purpose</span><strong>{sectionAnalysis.resumePurpose || 'Not detected'}</strong></div></Card>
    <Card className="section-card"><div className="card-heading"><div><h2>Section availability</h2><p>Presence and relevance are based on the resume context.</p></div></div>{sections.length ? <div className="availability-list">{sections.map((section, index) => <div className="availability-row" key={`${section.name}-${index}`}><div className="availability-name"><strong>{section.name || 'Unnamed section'}</strong><p>{section.reason || 'No explanatory comment was returned.'}</p></div><div className="availability-badges"><Badge tone={section.status === 'present' ? 'success' : section.status === 'optional' ? 'info' : 'warning'}>{section.status === 'present' ? 'Present' : section.status === 'optional' ? 'Optional' : section.status || 'Not assessed'}</Badge>{section.relevance ? <Badge tone={String(section.relevance).toLowerCase()}>{section.relevance}</Badge> : null}</div></div>)}</div> : <EmptyState title="Section analysis unavailable" description="No section availability details were returned." />}</Card>
  </section>
}

export default AnalysisPage
