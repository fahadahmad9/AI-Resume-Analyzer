import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export async function matchResume(resumeId, jobDescription) {
  const response = await axios.post(
    `${apiBaseUrl}/api/resume/${resumeId}/match`,
    { jobDescription },
  )

  return response.data
}
