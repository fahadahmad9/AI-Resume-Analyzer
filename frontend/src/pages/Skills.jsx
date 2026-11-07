import { useMemo, useState } from 'react'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import EmptyState from '../components/ui/EmptyState'
import { useResume } from '../context/useResume'
import { humanizeKey } from '../utils/formatters'

function SkillsPage() {
  const { result } = useResume()
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => Object.entries(result?.structured?.skillCategories || {}).map(([category, skills]) => [category, (Array.isArray(skills) ? skills : []).filter((skill) => String(skill).toLowerCase().includes(query.toLowerCase()))]).filter(([, skills]) => skills.length), [result, query])
  return <section className="results-page"><div className="page-intro"><span className="eyebrow">Skill inventory</span><h1>Your skills</h1><p>Search across the skills extracted from your resume.</p></div><div className="search-field"><label htmlFor="skill-search">Filter skills</label><input id="skill-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search skills..." /></div><section className="skill-grid">{filtered.length ? filtered.map(([category, skills]) => <Card className="skill-card" key={category}><div className="card-heading"><h2>{humanizeKey(category)}</h2><span className="count-badge">{skills.length}</span></div><div className="chip-list">{skills.map((skill) => <Chip key={`${category}-${skill}`}>{skill}</Chip>)}</div></Card>) : <Card className="full-card"><EmptyState title="No matching skills" description="Try a different search term or check back after uploading another resume." /></Card>}</section></section>
}

export default SkillsPage
