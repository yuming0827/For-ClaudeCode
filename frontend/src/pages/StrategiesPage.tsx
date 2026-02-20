import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useStrategyStore } from '../store/strategies'
import type { Strategy } from '../store/strategies'
import StrategyCard from '../components/dashboard/StrategyCard'
import AddStrategyModal from '../components/strategy/AddStrategyModal'
import EditStrategyModal from '../components/strategy/EditStrategyModal'
import toast from 'react-hot-toast'

export default function StrategiesPage() {
  const { strategies, fetchStrategies, stopStrategy } = useStrategyStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<Strategy | null>(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchStrategies() }, [fetchStrategies])

  const filtered = strategies.filter((s) =>
    filter === 'all' ? true : s.status === filter,
  )

  const handleStop = async (id: string) => {
    await stopStrategy(id)
    toast.success('Strategy stopped')
  }

  const statusCounts = {
    all: strategies.length,
    running: strategies.filter((s) => s.status === 'running').length,
    stopped: strategies.filter((s) => s.status === 'stopped').length,
    error: strategies.filter((s) => s.status === 'error').length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Strategies</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={15} /> New Strategy
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'running', 'stopped', 'error'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              filter === f
                ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                : 'text-gray-400 hover:text-gray-100 hover:bg-surface-200'
            }`}
          >
            {f} ({statusCounts[f]})
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <StrategyCard
            key={s.id}
            strategy={s}
            onStop={handleStop}
            onEdit={setEditTarget}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card py-16 text-center">
          <p className="text-gray-400 text-sm">No strategies in this filter</p>
        </div>
      )}

      {showAdd && <AddStrategyModal onClose={() => setShowAdd(false)} />}
      {editTarget && (
        <EditStrategyModal strategy={editTarget} onClose={() => setEditTarget(null)} />
      )}
    </div>
  )
}
