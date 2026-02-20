import { useState } from 'react'
import { X } from 'lucide-react'
import { useStrategyStore } from '../../store/strategies'
import toast from 'react-hot-toast'

interface Props { onClose: () => void }

const DEFAULTS = {
  trend_following: { ema_fast: 20, ema_slow: 50, adx_threshold: 25 },
  mean_reversion: { lookback: 20, z_entry: 2.0, rsi_oversold: 30, rsi_overbought: 70 },
  event_driven: { volume_surge_mult: 3.0, price_gap_threshold_pct: 0.03 },
}

export default function AddStrategyModal({ onClose }: Props) {
  const addStrategy = useStrategyStore((s) => s.addStrategy)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    strategy_type: 'trend_following',
    asset_class: 'crypto',
    symbol: 'BTC/USDT',
    timeframe: '1h',
    stop_loss_pct: 0.02,
    take_profit_pct: 0.04,
    position_size_pct: 0.1,
  })

  const set = (key: string, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { toast.error('Strategy name required'); return }
    setLoading(true)
    try {
      const stratParams = DEFAULTS[form.strategy_type as keyof typeof DEFAULTS] ?? {}
      await addStrategy({ ...form, params: stratParams })
      toast.success(`Strategy "${form.name}" deployed!`)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deploy'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-50 border border-border rounded-xl w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold text-white">Deploy Strategy</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="label">Strategy Name</label>
            <input
              className="input"
              placeholder="My Trend Strategy"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          {/* Type + Asset Class */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Strategy Type</label>
              <select
                className="input"
                value={form.strategy_type}
                onChange={(e) => set('strategy_type', e.target.value)}
              >
                <option value="trend_following">Trend Following</option>
                <option value="mean_reversion">Mean Reversion</option>
                <option value="event_driven">Event Driven</option>
              </select>
            </div>
            <div>
              <label className="label">Asset Class</label>
              <select
                className="input"
                value={form.asset_class}
                onChange={(e) => set('asset_class', e.target.value)}
              >
                <option value="crypto">Crypto</option>
                <option value="us_stock">US Stocks</option>
                <option value="tw_stock">TW Stocks</option>
              </select>
            </div>
          </div>

          {/* Symbol + Timeframe */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Symbol</label>
              <input
                className="input"
                placeholder="BTC/USDT"
                value={form.symbol}
                onChange={(e) => set('symbol', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Timeframe</label>
              <select
                className="input"
                value={form.timeframe}
                onChange={(e) => set('timeframe', e.target.value)}
              >
                {['1m','5m','15m','30m','1h','4h','1d'].map((tf) => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Risk params */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Stop Loss %</label>
              <input
                type="number" className="input" step="0.001" min="0.001" max="0.5"
                value={form.stop_loss_pct}
                onChange={(e) => set('stop_loss_pct', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Take Profit %</label>
              <input
                type="number" className="input" step="0.001" min="0.001"
                value={form.take_profit_pct}
                onChange={(e) => set('take_profit_pct', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Position Size %</label>
              <input
                type="number" className="input" step="0.01" min="0.01" max="1"
                value={form.position_size_pct}
                onChange={(e) => set('position_size_pct', parseFloat(e.target.value))}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Deploying…' : 'Deploy Strategy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
