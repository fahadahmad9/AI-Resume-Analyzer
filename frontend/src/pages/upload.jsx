import { useMemo, useState } from 'react'
import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function formatSectionStatus(status) {
  switch (status) {
    case 'present':
      return 'Present'
    case 'missing_relevant':
      return 'Relevant section missing'
    case 'optional':
      return 'Optional'
    case 'not_applicable':
      return 'Not applicable'
    default:
      return status || 'Unspecified'
  }
}

function UploadPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [parsedResume, setParsedResume] = useState(null)

  const fileInfo = useMemo(() => {
    if (!selectedFile) return 'No file selected'
    const sizeInMb = (selectedFile.size / (1024 * 1024)).toFixed(2)
    return `${selectedFile.name} (${sizeInMb} MB)`
  }, [selectedFile])

  const structuredResume = parsedResume?.structured || null
  const scoreBreakdown = structuredResume?.score?.breakdown || null
  const scoreStrengths = structuredResume?.score?.strengths || []
  const scoreWeaknesses = structuredResume?.score?.weaknesses || []
  const aiAnalysis = parsedResume?.aiAnalysis || null
  const sectionAnalysis = aiAnalysis?.sectionAnalysis || null
  const aiQualitySections = Object.entries(aiAnalysis?.qualityDimensions || {})
    .filter(([, section]) => section && typeof section.score === 'number')
    .map(([key, section]) => [key.replace(/([A-Z])/g, ' $1').trim(), section])

  const handleFileChange = (event) => {
    const [file] = event.target.files || []

    if (!file) {
      setSelectedFile(null)
      return
    }

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file only.')
      event.target.value = ''
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
    setErrorMessage('')
    setParsedResume(null)
  }

  const handleUpload = async () => {
    if (!selectedFile || isUploading) {
      return
    }

    const formData = new FormData()
    formData.append('resume', selectedFile)

    setIsUploading(true)
    setErrorMessage('')

    try {
      const response = await axios.post(`${apiBaseUrl}/api/resume/parse`, formData)
      setParsedResume(response.data)
    } 
    catch (error) {
      setParsedResume(null)
      setErrorMessage(
        error.response?.data?.message || 'Failed to upload and parse the resume.',
      )
    } 
    finally {
      setIsUploading(false)
    }
  }

  return (
    <main className="upload-page">
      <section className="upload-card">
        <h1>Upload Resume</h1>
        <p>Select a PDF resume to begin analysis.</p>

        <label className="upload-input" htmlFor="resume-pdf">
          <span>Choose Resume PDF</span>
          <input
            id="resume-pdf"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
          />
        </label>

        <p className="upload-file-info">{fileInfo}</p>
        <button
          type="button"
          className="upload-button"
          disabled={!selectedFile || isUploading}
          onClick={handleUpload}
        >
          {isUploading ? 'Parsing...' : 'Upload and Parse'}
        </button>

        {errorMessage ? <p className="upload-error">{errorMessage}</p> : null}

        {parsedResume ? (
          <div className="upload-result">
            <div className="upload-result-header">
              <div>
                <h2>Parsed Resume</h2>
                <p>{parsedResume.fileName}</p>
              </div>
              <div className="upload-page-count">
                <span>Page count</span>
                <strong>{parsedResume.pageCount ?? 'Unknown'}</strong>
              </div>
            </div>

            {structuredResume ? (
              <div className="resume-grid">
                <section className="resume-panel resume-score-panel">
                  <h3>Resume Score</h3>
                  <div className="resume-score-total">
                    <strong>{structuredResume.score?.total ?? 'N/A'}</strong>
                    <span>/ {structuredResume.score?.maxScore ?? 100}</span>
                  </div>

                  {structuredResume.score?.interpretation ? (
                    <p className="resume-score-interpretation">{structuredResume.score.interpretation}</p>
                  ) : null}

                  {scoreBreakdown ? (
                    <div className="score-breakdown-list">
                      {Object.entries(scoreBreakdown).map(([label, entry]) => (
                        <div key={label} className="score-breakdown-item">
                          <div className="score-breakdown-header">
                            <span>{label.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <strong>
                              {entry.score}/{entry.maxScore}
                            </strong>
                          </div>
                          <div className="score-bar">
                            <div
                              className="score-bar-fill"
                              style={{ width: `${(entry.score / entry.maxScore) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {structuredResume.score?.strengths?.length ? (
                    <div className="score-notes">
                      <h4>Strengths</h4>
                      <ul className="resume-list">
                        {scoreStrengths.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {structuredResume.score?.weaknesses?.length ? (
                    <div className="score-notes">
                      <h4>Weaknesses</h4>
                      <ul className="resume-list">
                        {scoreWeaknesses.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>

                {aiAnalysis ? (
                  <section className="resume-panel resume-ai-analysis">
                    <h3>AI Resume Analysis</h3>

                    <div className="score-breakdown-list">
                      {aiQualitySections.map(([label, section]) => (
                        <div key={label} className="score-breakdown-item">
                          <div className="score-breakdown-header">
                            <span>{label}</span>
                            <strong>{section?.score ?? 'N/A'}/100</strong>
                          </div>
                          {typeof section?.score === 'number' ? (
                            <div className="score-bar">
                              <div
                                className="score-bar-fill"
                                style={{ width: `${Math.max(0, Math.min(100, section.score))}%` }}
                              />
                            </div>
                          ) : null}
                          {section?.findings?.length ? (
                            <ul className="resume-list">
                              {section.findings.map((finding) => (
                                <li key={finding}>{finding}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    {[
                      ['Overall Strengths', aiAnalysis.overallStrengths],
                      ['Overall Weaknesses', aiAnalysis.overallWeaknesses],
                      ['Priority Improvements', aiAnalysis.priorityImprovements],
                    ].map(([label, items]) => (
                      <div key={label} className="score-notes">
                        <h4>{label}</h4>
                        {items?.length ? (
                          <ul className="resume-list">
                            {items.map((item) => <li key={item}>{item}</li>)}
                          </ul>
                        ) : (
                          <p className="resume-empty">No items provided.</p>
                        )}
                      </div>
                    ))}
                  </section>
                ) : null}

                <section className="resume-panel resume-profile">
                  <h3>Profile</h3>
                  <div className="resume-detail-list">
                    <div>
                      <span>Name</span>
                      <strong>{structuredResume.name || 'Not detected'}</strong>
                    </div>
                    <div>
                      <span>Email</span>
                      <strong>{structuredResume.email || 'Not detected'}</strong>
                    </div>
                    <div>
                      <span>Phone</span>
                      <strong>{structuredResume.phone || 'Not detected'}</strong>
                    </div>
                    <div>
                      <span>LinkedIn</span>
                      <strong>{structuredResume.socialLinks?.linkedin || 'Not detected'}</strong>
                    </div>
                    <div>
                      <span>GitHub</span>
                      <strong>{structuredResume.socialLinks?.github || 'Not detected'}</strong>
                    </div>
                    <div>
                      <span>Detected Profiles</span>
                      <strong>
                        {(structuredResume.profiles?.linkedin?.length || 0) + (structuredResume.profiles?.github?.length || 0) > 0
                          ? 'Yes'
                          : 'Not detected'}
                      </strong>
                    </div>
                  </div>
                </section>

                <section className="resume-panel">
                  <h3>Section Availability</h3>
                  {sectionAnalysis?.sections?.length ? (
                    <>
                      <div className="section-analysis-context">
                        {sectionAnalysis.domain ? (
                          <div>
                            <span>Domain</span>
                            <strong>{sectionAnalysis.domain}</strong>
                          </div>
                        ) : null}
                        {sectionAnalysis.resumePurpose ? (
                          <div>
                            <span>Resume purpose</span>
                            <strong>{sectionAnalysis.resumePurpose}</strong>
                          </div>
                        ) : null}
                      </div>
                    <div className="section-availability-list">
                      {sectionAnalysis.sections.map((section, index) => (
                        <div key={`${section.name}-${index}`} className="section-availability-item">
                          <div className="section-availability-details">
                            <strong>{section.name || 'Unnamed section'}</strong>
                            {section.reason ? <p>{section.reason}</p> : null}
                          </div>
                          <div className="section-availability-meta">
                            <strong className={`section-badge section-badge-${section.status || 'unknown'}`}>
                              {formatSectionStatus(section.status)}
                            </strong>
                            {section.relevance ? <span>Relevance: {section.relevance}</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                    </>
                  ) : (
                    <p className="resume-empty">Section relevance analysis is unavailable.</p>
                  )}
                </section>

                <section className="resume-panel resume-skill-categories">
                  <h3>Categorized Skills</h3>
                  {structuredResume.skillCategories ? (
                    <div className="skill-category-grid">
                      {Object.entries(structuredResume.skillCategories)
                        .filter(([, skills]) => Array.isArray(skills) && skills.length > 0)
                        .map(([category, skills]) => (
                        <div key={category} className="skill-category-card">
                          <h4>{category}</h4>
                          <div className="skill-tags">
                            {skills.map((skill) => (
                              <span key={`${category}-${skill}`} className="skill-tag">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        ))}
                    </div>
                  ) : (
                    <p className="resume-empty">No categorized skills available.</p>
                  )}
                </section>

                <section className="resume-panel">
                  <h3>Summary</h3>
                  <p className="resume-paragraph">{structuredResume.summary || 'No extracted summary content.'}</p>
                </section>

                <section className="resume-panel">
                  <h3>Education</h3>
                  {structuredResume.education?.length ? (
                    <ul className="resume-list">
                      {structuredResume.education.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="resume-empty">No extracted education content.</p>
                  )}
                </section>

                <section className="resume-panel">
                  <h3>Experience</h3>
                  {structuredResume.experience?.length ? (
                    <ul className="resume-list">
                      {structuredResume.experience.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="resume-empty">No extracted experience content.</p>
                  )}
                </section>

                <section className="resume-panel">
                  <h3>Projects</h3>
                  {structuredResume.projects?.length ? (
                    <ul className="resume-list">
                      {structuredResume.projects.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="resume-empty">No extracted project content.</p>
                  )}
                </section>
              </div>
            ) : null}

            <details className="resume-raw">
              <summary>Raw extracted text</summary>
              <pre>{parsedResume.preview}</pre>
            </details>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default UploadPage