import { Info } from 'lucide-react'
import { isDemoMode } from '../../utils/api'

export default function DemoBanner() {
  if (!isDemoMode) return null
  return (
    <div className="bg-accent-yellow/10 border-b border-accent-yellow/30 px-4 py-1.5
                    flex items-center gap-2 text-xs text-accent-yellow font-mono">
      <Info size={12} />
      <span>
        <strong>Demo Mode</strong> — Live mock data. Connect a real backend by setting{' '}
        <code className="bg-black/30 px-1 rounded">VITE_API_URL</code>.
      </span>
    </div>
  )
}
