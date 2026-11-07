import { AlertCircle } from 'lucide-react'

function ErrorBanner({ children, onRetry }) {
  return <div className="error-banner" role="alert"><AlertCircle size={18} /><span>{children}</span>{onRetry ? <button type="button" onClick={onRetry}>Try again</button> : null}</div>
}

export default ErrorBanner
