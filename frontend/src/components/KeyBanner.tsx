import { Link } from 'react-router-dom'
import { useKey } from '../lib/hooks'

export default function KeyBanner() {
  if (useKey()) return null
  return (
    <div className="mb-6 border border-gold/40 bg-gold/5 px-4 py-3 text-sm text-parchment/90">
      Philosophers and models need your own Groq API key. <Link to="/settings" className="text-gold underline underline-offset-4">Add it in Settings</Link>. It stays in your browser and is never stored on our server.
    </div>
  )
}
