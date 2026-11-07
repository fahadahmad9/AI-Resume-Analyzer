import { useCallback, useMemo, useState } from 'react'
import { matchResume, parseResume } from '../services/api'
import { ResumeContext } from './ResumeContextValue'

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback
}

export function ResumeProvider({ children }) {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [resumeId, setResumeId] = useState(null)
  const [jd, setJd] = useState('')
  const [matchStatus, setMatchStatus] = useState('idle')
  const [matchResult, setMatchResult] = useState(null)
  const [matchError, setMatchError] = useState('')

  const analyze = useCallback(async (nextFile) => {
    setFile(nextFile)
    setStatus('analyzing')
    setError('')
    setResult(null)
    setResumeId(null)
    setMatchStatus('idle')
    setMatchResult(null)
    setMatchError('')

    try {
      const parsed = await parseResume(nextFile)
      setResult(parsed)
      setResumeId(parsed.resumeId ?? null)
      setStatus('done')
      return parsed
    } catch (requestError) {
      setStatus('error')
      setError(getErrorMessage(requestError, 'Failed to upload and parse the resume.'))
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setFile(null)
    setStatus('idle')
    setError('')
    setResult(null)
    setResumeId(null)
    setJd('')
    setMatchStatus('idle')
    setMatchResult(null)
    setMatchError('')
  }, [])

  const runMatch = useCallback(async (jobDescription) => {
    if (!resumeId) return null
    setJd(jobDescription)
    setMatchStatus('matching')
    setMatchError('')

    try {
      const matched = await matchResume(resumeId, jobDescription.trim())
      setMatchResult(matched)
      setMatchStatus('done')
      return matched
    } catch (requestError) {
      const messageByStatus = {
        400: 'Please enter a job description with at least 50 characters.',
        404: 'This resume is no longer available. Please upload it again.',
        500: 'The comparison service could not complete the request. Please try again.',
      }
      setMatchStatus('error')
      setMatchResult(null)
      setMatchError(
        messageByStatus[requestError.response?.status]
          || getErrorMessage(requestError, 'Unable to compare the resume. Check your connection and try again.'),
      )
      return null
    }
  }, [resumeId])

  const resetMatch = useCallback(() => {
    setJd('')
    setMatchStatus('idle')
    setMatchResult(null)
    setMatchError('')
  }, [])

  const value = useMemo(() => ({
    file, status, error, result, resumeId, jd, matchStatus, matchResult, matchError,
    analyze, reset, runMatch, resetMatch,
  }), [file, status, error, result, resumeId, jd, matchStatus, matchResult, matchError, analyze, reset, runMatch, resetMatch])

  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>
}
