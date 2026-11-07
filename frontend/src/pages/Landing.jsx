import { createElement } from 'react'
import { ArrowRight, BarChart3, CheckCircle2, FileSearch, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

function Logo() {
  return <span className="brand-mark" aria-hidden="true"><Sparkles size={16} /></span>
}

function Landing() {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Link className="brand" to="/"><Logo /><span>AI Resume Analyzer</span></Link>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <Link className="button button-primary button-small" to="/app">Get started <ArrowRight size={16} /></Link>
        </nav>
      </header>
      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={14} /> Smarter career decisions</span>
            <h1>Know exactly how your resume stacks up</h1>
            <p>Parse, score, and review your resume with AI, then match it to a job description with clear evidence.</p>
            <div className="hero-actions">
              <Link className="button button-primary" to="/app">Get started <ArrowRight size={17} /></Link>
              <a className="button button-secondary" href="#how-it-works">How it works</a>
            </div>
          </div>
          <div className="product-mock" aria-label="Resume score preview">
            <div className="mock-top"><span>Resume overview</span><span className="mock-dot" /></div>
            <div className="mock-score-row">
              <div className="score-ring"><strong>84</strong><span>/100</span></div>
              <div><strong className="mock-title">Strong foundation</strong><p>Above average for your target role</p></div>
            </div>
            <div className="mock-metrics">
              {['Experience', 'Skills', 'Clarity'].map((label, index) => <div className="mock-metric" key={label}><div><span>{label}</span><strong>{[91, 82, 78][index]}%</strong></div><div className="metric-track"><span style={{ width: `${[91, 82, 78][index]}%` }} /></div></div>)}
            </div>
            <div className="mock-note"><CheckCircle2 size={16} /> AI found 6 strengths to highlight</div>
          </div>
        </section>
        <section className="feature-section" aria-label="Features">
          {[
            [FileSearch, 'Instant parsing & scoring', 'Turn a PDF into a structured resume score in seconds.'],
            [Sparkles, 'AI-powered review', 'Get thoughtful findings and prioritized improvements.'],
            [BarChart3, 'Job match with evidence', 'See what matches, what is missing, and why.'],
          ].map(([Icon, title, description]) => <article className="feature-card" key={title}><span className="feature-icon">{createElement(Icon, { size: 20 })}</span><h2>{title}</h2><p>{description}</p></article>)}
        </section>
        <section className="how-section" id="how-it-works">
          <div className="section-heading"><span className="eyebrow">A clearer next step</span><h2>From PDF to a better application</h2><p>Everything you need to make your resume work harder.</p></div>
          <div className="steps">{[['01', 'Upload', 'Drop in your resume PDF and let us do the setup.'], ['02', 'Review', 'Understand your strengths and the changes worth making.'], ['03', 'Compare with a job description', 'Get a grounded match score with resume evidence.']].map(([number, title, description]) => <article className="step" key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
        </section>
      </main>
      <footer className="landing-footer"><span>Built for better applications.</span><div><a href="https://www.linkedin.com/in/fahadahmad0013" target="_blank" rel="noreferrer">LinkedIn</a><a href="https://github.com/fahadahmad9" target="_blank" rel="noreferrer">GitHub</a></div></footer>
    </div>
  )
}

export default Landing
