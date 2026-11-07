import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ResumeProvider } from './context/ResumeContext'
import { useResume } from './context/useResume'
import AppLayout from './layouts/AppLayout'
import Landing from './pages/Landing'
import UploadPage from './pages/Upload'
import OverviewPage from './pages/Overview'
import AnalysisPage from './pages/Analysis'
import SkillsPage from './pages/Skills'
import DetailsPage from './pages/Details'
import MatchPage from './pages/Match'

function App() {
  return (
    <BrowserRouter>
      <ResumeProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<UploadPage />} />
            <Route element={<ResultRoute />}>
              <Route path="overview" element={<OverviewPage />} />
              <Route path="analysis" element={<AnalysisPage />} />
              <Route path="skills" element={<SkillsPage />} />
              <Route path="details" element={<DetailsPage />} />
              <Route path="match" element={<MatchPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ResumeProvider>
    </BrowserRouter>
  )
}

function ResultRoute() {
  const { result } = useResume()
  return result ? <Outlet /> : <Navigate to="/app" replace />
}

export default App
