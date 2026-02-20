import { useEffect, useState } from 'react'
import {
  TrendingUp, TrendingDown, Activity,
  AlertTriangle, Plus, DollarSign, Shield,
} from 'lucide-react'
import { useStrategyStore } from '../store/strategies'
import StatCard from '../components/common/StatCard'
import StrategyCard from '../components/dashboard/StrategyCard'
import AddStrategyModal from '../components/strategy/AddStrategyModal'
import EditStrategyModal from '../components/strategy/EditStrategyModal'
import type { Strategy } from '../store/strategies'
import { fmtUSD, fmtPct, pnlClass } from '../utils/format'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { strategies, fetchStrategies, stopStrategy } = useStrategyStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<Strategy | null>(null)

  useEffect(() => { fetchStrategies() }, [fetchStrategies])

  const totalPnl = strategies.reduce((s, st) => s + st.pnl, 0)
  const runningCount = strategies.filter((s) => s.status === 'running').length
  const totalTrades = strategies.reduce((s, st) => s + st.num_trades, 0)
  const avgSharpe = strategies.length
    ? strategies.reduce((s, st) => s + st.sharpe_ratio, 0) / strategies.length
    : 0

  const handleStop = async (id: string) => {
    await stopStrategy(id)
    toast.success('Strategy stopped')
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {runningCount} strategies running · Live
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={15} /> Deploy Strategy
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total PnL"
          value={fmtUSD(totalPnl)}
          subValue={<span className={pnlClass(totalPnl)}>{fmtPct(totalPnl / 1000)}</span>}
          icon={<DollarSign size={16} />}
          trend={totalPnl >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="Running Strategies"
          value={runningCount}
          subValue={`${strategies.length} total deployed`}
          icon={<Activity size={16} />}
          trend="neutral"
        />
        <StatCard
          label="Total Trades"
          value={totalTrades}
          icon={<TrendingUp size={16} />}
          trend="neutral"
        />
        <StatCard
          label="Avg Sharpe Ratio"
          value={avgSharpe.toFixed(2)}
          icon={<Shield size={16} />}
          trend={avgSharpe >= 1 ? 'up' : avgSharpe < 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* Strategy Grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
          Active Strategies
        </h2>
        {strategies.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle size={32} className="text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No strategies deployed</p>
            <p className="text-gray-600 text-xs mt-1">Click "Deploy Strategy" to get started</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">
              <Plus size={14} /> Deploy First Strategy
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {strategies.map((s) => (
              <StrategyCard
                key={s.id}
                strategy={s}
                onStop={handleStop}
                onEdit={setEditTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* Performance Table */}
      {strategies.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
            Performance Summary
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-border">
                  <th className="text-left pb-2 pr-4">Strategy</th>
                  <th className="text-right pb-2 pr-4">PnL</th>
                  <th className="text-right pb-2 pr-4">Win Rate</th>
                  <th className="text-right pb-2 pr-4">Sharpe</th>
                  <th className="text-right pb-2 pr-4">Max DD</th>
                  <th className="text-right pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {strategies.map((s) => (
                  <tr key={s.id} className="table-row">
                    <td className="py-2 pr-4">
                      <div className="text-white font-medium">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.symbol}</div>
                    </td>
                    <td className={clsx('text-right pr-4 font-mono', pnlClass(s.pnl))}>
                      {s.pnl >= 0 ? '+' : ''}{s.pnl.toFixed(2)}
                    </td>
                    <td className="text-right pr-4 font-mono text-accent-green">
                      {s.win_rate.toFixed(1)}%
                    </td>
                    <td className="text-right pr-4 font-mono text-accent-blue">
                      {s.sharpe_ratio.toFixed(2)}
                    </td>
                    <td className="text-right pr-4 font-mono text-accent-red">
                      {s.max_drawdown.toFixed(2)}%
                    </td>
                    <td className="text-right">
                      <span className={`badge ${
                        s.status === 'running' ? 'badge-green' :
                        s.status === 'error' ? 'badge-red' : 'badge-gray'
                      }`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAdd && <AddStrategyModal onClose={() => setShowAdd(false)} />}
      {editTarget && (
        <EditStrategyModal strategy={editTarget} onClose={() => setEditTarget(null)} />
      )}
    </div>
  )
}
