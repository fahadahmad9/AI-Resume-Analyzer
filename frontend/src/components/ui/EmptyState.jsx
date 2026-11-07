function EmptyState({ title, description }) {
  return <div className="empty-state"><span className="empty-state-icon">—</span><strong>{title}</strong><p>{description}</p></div>
}

export default EmptyState
