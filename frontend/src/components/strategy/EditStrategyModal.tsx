import { useState } from 'react'
import { X } from 'lucide-react'
import type { Strategy } from '../../store/strategies'
import { useStrategyStore } from '../../store/strategies'
import toast from 'react-hot-toast'

interface Props {
  strategy: Strategy
  onClose: () => void
}

export default function EditStrategyModal({ strategy, onClose }: Props) {
  const updateStrategy = useStrategyStore((s) => s.updateStrategy)
  const [loading, setLoading] = useState(false)
  const [stopLoss, setStopLoss] = useState(
    (strategy.params.stop_loss_pct as number) ?? 0.02,
  )
  const [takeProfit, setTakeProfit] = useState(
    (strategy.params.take_profit_pct as number) ?? 0.04,
  )
  const [posSize, setPosSize] = useState(
    (strategy.params.position_size_pct as number) ?? 0.1,
  )

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateStrategy(strategy.id, {
        stop_loss_pct: stopLoss,
        take_profit_pct: takeProfit,
        position_size_pct: posSize,
      })
      toast.success('Parameters updated live!')
      onClose()
    } catch {
      toast.error('Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-50 border border-border rounded-xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-white">Edit Parameters</h2>
            <p className="text-xs text-gray-500 mt-0.5">{strategy.name} · {strategy.symbol}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded"><X size={16} /></button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="bg-surface-100 rounded-lg p-3 text-xs text-accent-blue border border-accent-blue/20">
            Changes apply immediately without restarting the strategy.
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Stop Loss %</label>
              <input
                type="number" className="input" step="0.001" min="0.001" max="0.5"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Take Profit %</label>
              <input
                type="number" className="input" step="0.001" min="0.001"
                value={takeProfit}
                onChange={(e) => setTakeProfit(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Position Size %</label>
              <input
                type="number" className="input" step="0.01" min="0.01" max="1"
                value={posSize}
                onChange={(e) => setPosSize(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving…' : 'Update Live'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
