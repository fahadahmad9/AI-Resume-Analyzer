import { useEffect, useRef, useState } from 'react'
import { FileText, UploadCloud, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ErrorBanner from '../components/ui/ErrorBanner'
import Spinner from '../components/ui/Spinner'
import { useResume } from '../context/useResume'

function formatFileSize(size) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

function UploadPage() {
  const { file: analyzedFile, status, error, analyze, reset } = useResume()
  const [selectedFile, setSelectedFile] = useState(null)
  const [validationError, setValidationError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (status !== 'analyzing') return undefined
    const started = Date.now()
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [status])

  const selectFile = (nextFile) => {
    if (!nextFile) return
    if (nextFile.type !== 'application/pdf' && !nextFile.name.toLowerCase().endsWith('.pdf')) {
      setValidationError('Please choose a PDF file. Other file types are not supported.')
      return
    }
    setValidationError('')
    setSelectedFile(nextFile)
  }

  const handleInput = (event) => {
    selectFile(event.target.files?.[0])
    event.target.value = ''
  }

  const handleDrop = (event) => {
    event.preventDefault()
    selectFile(event.dataTransfer.files?.[0])
  }

  const handleAnalyze = async () => {
    const fileToAnalyze = selectedFile || analyzedFile
    if (!fileToAnalyze) return
    const parsed = await analyze(fileToAnalyze)
    if (parsed) navigate('/app/overview')
  }

  if (status === 'analyzing') return <section className="loading-page"><Card className="loading-card"><Spinner label="Analyzing resume" /><h1>Analyzing your resume</h1><p>This can take up to a minute.</p><span className="elapsed-time">Elapsed: {elapsed}s</span></Card></section>

  return <section className="upload-page"><div className="page-intro upload-intro"><span className="eyebrow">Start here</span><h1>Upload your resume</h1><p>Get a clear view of your strengths, opportunities, and job fit.</p></div><Card className="upload-card">
    {!selectedFile && !analyzedFile ? <button className="drop-zone" type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}><UploadCloud size={30} /><strong>Drop your PDF here, or browse</strong><span>PDF files only · up to 5 MB</span><input ref={inputRef} type="file" accept="application/pdf" onChange={handleInput} aria-label="Choose resume PDF" /></button> : <div className="selected-file"><span className="file-icon"><FileText size={21} /></span><div><strong>{(selectedFile || analyzedFile).name}</strong><span>{formatFileSize((selectedFile || analyzedFile).size)}</span></div><button className="icon-button" type="button" aria-label="Remove selected resume" onClick={() => { setSelectedFile(null); reset() }}><X size={18} /></button></div>}
    {validationError ? <ErrorBanner>{validationError}</ErrorBanner> : null}
    {error ? <ErrorBanner onRetry={handleAnalyze}>{error}</ErrorBanner> : null}
    <Button className="button-primary analyze-button" disabled={!(selectedFile || analyzedFile) || status === 'analyzing'} onClick={handleAnalyze}>Analyze resume</Button>
    <p className="privacy-note">Resumes are processed with Google's Gemini API and deleted automatically after 24 hours.</p>
  </Card></section>
}

export default UploadPage
