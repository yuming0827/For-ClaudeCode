import { TrendingUp, TrendingDown, Square, RotateCcw } from 'lucide-react'
import { clsx } from 'clsx'
import type { Strategy } from '../../store/strategies'
import { fmtPrice, fmtPct, pnlClass, statusBadge } from '../../utils/format'

interface Props {
  strategy: Strategy
  onStop: (id: string) => void
  onEdit: (strategy: Strategy) => void
}

export default function StrategyCard({ strategy, onStop, onEdit }: Props) {
  const isPos = strategy.pnl >= 0
  const PnlIcon = isPos ? TrendingUp : TrendingDown

  return (
    <div className={clsx(
      'card flex flex-col gap-3 animate-fade-in',
      strategy.status === 'running' && 'border-l-2 border-l-accent-green',
      strategy.status === 'error' && 'border-l-2 border-l-accent-red',
      strategy.status === 'stopped' && 'border-l-2 border-l-gray-500',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{strategy.name}</span>
            <span className={statusBadge(strategy.status)}>{strategy.status}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {strategy.symbol} · {strategy.asset_class} · {strategy.strategy_type}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(strategy)}
            className="btn-ghost p-1.5 rounded"
            title="Edit parameters"
          >
            <RotateCcw size={13} />
          </button>
          {strategy.status === 'running' && (
            <button
              onClick={() => onStop(strategy.id)}
              className="btn-ghost p-1.5 rounded text-accent-red hover:bg-accent-red/10"
              title="Emergency stop"
            >
              <Square size={13} />
            </button>
          )}
        </div>
      </div>

      {/* PnL */}
      <div className="flex items-center gap-2">
        <PnlIcon size={16} className={isPos ? 'text-accent-green' : 'text-accent-red'} />
        <span className={clsx('text-xl font-bold', pnlClass(strategy.pnl))}>
          {fmtPct(strategy.pnl_pct)}
        </span>
        <span className={clsx('text-sm', pnlClass(strategy.pnl))}>
          ({strategy.pnl >= 0 ? '+' : ''}{strategy.pnl.toFixed(2)})
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-gray-500">Price</div>
          <div className="text-white font-mono">{fmtPrice(strategy.current_price)}</div>
        </div>
        <div>
          <div className="text-gray-500">Position</div>
          <div className="text-white font-mono">{strategy.position.toFixed(4)}</div>
        </div>
        <div>
          <div className="text-gray-500">Trades</div>
          <div className="text-white font-mono">{strategy.num_trades}</div>
        </div>
        <div>
          <div className="text-gray-500">Win Rate</div>
          <div className="text-accent-green font-mono">{strategy.win_rate.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-gray-500">Sharpe</div>
          <div className="text-accent-blue font-mono">{strategy.sharpe_ratio.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-500">Max DD</div>
          <div className="text-accent-red font-mono">{strategy.max_drawdown.toFixed(2)}%</div>
        </div>
      </div>

      {/* Unrealized PnL bar */}
      {strategy.position !== 0 && (
        <div className="text-xs text-gray-500">
          Unrealized:{' '}
          <span className={pnlClass(strategy.unrealized_pnl)}>
            {strategy.unrealized_pnl >= 0 ? '+' : ''}{strategy.unrealized_pnl.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}
