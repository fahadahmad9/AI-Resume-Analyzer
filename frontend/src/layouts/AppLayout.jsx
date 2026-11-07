import { createElement, useState } from 'react'
import { FileText, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, SearchCheck, Sparkles, UserRound, X, Zap } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useResume } from '../context/useResume'
import Button from '../components/ui/Button'
import Stepper from '../components/ui/Stepper'

const navItems = [
  ['Upload', '/app', FileText],
  ['Overview', '/app/overview', LayoutDashboard],
  ['AI Analysis', '/app/analysis', Sparkles],
  ['Skills', '/app/skills', Zap],
  ['Resume Details', '/app/details', UserRound],
  ['Job Match', '/app/match', SearchCheck],
]

function AppLayout() {
  const { file, result, reset } = useResume()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('resume-sidebar-collapsed') === 'true' } catch { return false }
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem('resume-sidebar-collapsed', String(next)) } catch { /* localStorage may be unavailable */ }
  }

  const handleNewResume = () => {
    reset()
    setDrawerOpen(false)
    navigate('/app')
  }

  const step = location.pathname === '/app' ? 1 : location.pathname.endsWith('/match') ? 3 : 2
  const pageTitle = navItems.find(([, path]) => path === location.pathname)?.[0] || 'Upload'

  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <button className={`drawer-backdrop ${drawerOpen ? 'is-visible' : ''}`} type="button" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />
    <aside className={`app-sidebar ${drawerOpen ? 'drawer-open' : ''}`}>
      <div className="sidebar-header"><NavLink className="brand" to="/app" onClick={() => setDrawerOpen(false)}><span className="brand-mark"><Sparkles size={16} /></span><span className="sidebar-name">AI Resume Analyzer</span></NavLink><button className="icon-button sidebar-toggle" type="button" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} onClick={toggleCollapsed}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button><button className="icon-button drawer-close" type="button" aria-label="Close navigation" onClick={() => setDrawerOpen(false)}><X size={20} /></button></div>
      <nav className="sidebar-nav" aria-label="Workspace navigation">{navItems.map(([label, path, Icon]) => {
        const disabled = label !== 'Upload' && !result
        return disabled ? <span className="sidebar-link is-disabled" title={collapsed ? label : undefined} aria-disabled="true" key={label}>{createElement(Icon, { size: 18 })}<span>{label}</span></span> : <NavLink className={({ isActive }) => `sidebar-link ${isActive && (path === '/app' ? location.pathname === '/app' : true) ? 'active' : ''}`} to={path} title={collapsed ? label : undefined} aria-current={location.pathname === path ? 'page' : undefined} onClick={() => setDrawerOpen(false)} key={label}>{createElement(Icon, { size: 18 })}<span>{label}</span></NavLink>
      })}</nav>
      <div className="sidebar-bottom"><Button className="button-secondary new-resume-button" onClick={handleNewResume}><FileText size={17} /><span>New resume</span></Button>{file ? <div className="file-chip" title={file.name}><FileText size={14} /><span>{file.name}</span></div> : null}</div>
    </aside>
    <div className="app-content"><header className="app-topbar"><button className="icon-button mobile-menu" type="button" aria-label="Open navigation" onClick={() => setDrawerOpen(true)}><Menu size={21} /></button><div><h1>{pageTitle}</h1><p>Build a stronger application</p></div><Stepper activeStep={step} /></header><main className="app-main"><Outlet /></main></div>
  </div>
}

export default AppLayout
