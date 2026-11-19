import { AlertTriangle } from 'lucide-react'
export default function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null
  return (
    <div role="alert" className="flex items-start gap-3 border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-100">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <div className="flex-1">{message}</div>
      {onRetry && <button onClick={onRetry} className="text-gold underline underline-offset-4">Retry</button>}
    </div>
  )
}
