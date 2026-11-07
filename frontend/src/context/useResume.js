import { useContext } from 'react'
import { ResumeContext } from './ResumeContextValue'

export function useResume() {
  const context = useContext(ResumeContext)
  if (!context) throw new Error('useResume must be used within a ResumeProvider')
  return context
}
