import { useState } from 'react'
import { FlaskConical, TrendingUp, TrendingDown } from 'lucide-react'
import api from '../utils/api'
import EquityCurveChart from '../components/charts/EquityCurveChart'
import { fmtPct, pnlClass } from '../utils/format'
import { clsx } from 'clsx'

interface BacktestResult {
  total_return_pct: number
  annual_return_pct: number
  sharpe_ratio: number
  sortino_ratio: number
  calmar_ratio: number
  max_drawdown_pct: number
  win_rate: number
  profit_factor: number
  avg_trade_pct: number
  num_trades: number
  num_wins: number
  num_losses: number
  best_trade_pct: number
  worst_trade_pct: number
  var_95: number
  cvar_95: number
  equity_curve: Array<{ timestamp: string; equity: number }>
  drawdown_curve: Array<{ timestamp: string; drawdown: number }>
  trades: Array<{
    entry_time: string; exit_time: string; side: string
    entry_price: number; exit_price: number; quantity: number
    pnl: number; pnl_pct: number
  }>
}

export default function BacktestPage() {
  const [form, setForm] = useState({
    strategy_type: 'trend_following',
    asset_class: 'crypto',
    symbol: 'BTC/USDT',
    timeframe: '1d',
    start_date: '2023-01-01T00:00:00',
    end_date: '2024-01-01T00:00:00',
    initial_capital: 100000,
    commission: 0.001,
    slippage: 0.0005,
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  const runBacktest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const { data } = await api.post('/backtest/run', form)
      setResult(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Backtest failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <h1 className="text-xl font-bold text-white">Backtest Engine</h1>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="xl:col-span-1">
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Configuration
            </h2>

            <form onSubmit={runBacktest} className="space-y-3">
              <div>
                <label className="label">Strategy</label>
                <select className="input" value={form.strategy_type}
                  onChange={(e) => set('strategy_type', e.target.value)}>
                  <option value="trend_following">Trend Following</option>
                  <option value="mean_reversion">Mean Reversion</option>
                  <option value="event_driven">Event Driven</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Asset Class</label>
                  <select className="input" value={form.asset_class}
                    onChange={(e) => set('asset_class', e.target.value)}>
                    <option value="crypto">Crypto</option>
                    <option value="us_stock">US Stocks</option>
                    <option value="tw_stock">TW Stocks</option>
                  </select>
                </div>
                <div>
                  <label className="label">Symbol</label>
                  <input className="input" value={form.symbol}
                    onChange={(e) => set('symbol', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Timeframe</label>
                <select className="input" value={form.timeframe}
                  onChange={(e) => set('timeframe', e.target.value)}>
                  {['1m','5m','15m','1h','4h','1d'].map((tf) => (
                    <option key={tf} value={tf}>{tf}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Date</label>
                  <input type="datetime-local" className="input" value={form.start_date}
                    onChange={(e) => set('start_date', e.target.value)} />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input type="datetime-local" className="input" value={form.end_date}
                    onChange={(e) => set('end_date', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Initial Capital ($)</label>
                <input type="number" className="input" value={form.initial_capital}
                  onChange={(e) => set('initial_capital', parseFloat(e.target.value))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Commission</label>
                  <input type="number" className="input" step="0.0001" value={form.commission}
                    onChange={(e) => set('commission', parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="label">Slippage</label>
                  <input type="number" className="input" step="0.0001" value={form.slippage}
                    onChange={(e) => set('slippage', parseFloat(e.target.value))} />
                </div>
              </div>

              {error && (
                <div className="bg-accent-red/10 border border-accent-red/30 rounded p-3 text-xs text-accent-red">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                <FlaskConical size={14} />
                {loading ? 'Running Backtest…' : 'Run Backtest'}
              </button>
            </form>
          </div>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-2 space-y-4">
          {!result && !loading && (
            <div className="card flex items-center justify-center py-24 text-center">
              <div>
                <FlaskConical size={40} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Configure and run a backtest to see results</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="card flex items-center justify-center py-24">
              <div className="text-accent-blue text-sm animate-pulse">
                Running backtest simulation…
              </div>
            </div>
          )}

          {result && (
            <>
              {/* Performance Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Return', value: fmtPct(result.total_return_pct), pos: result.total_return_pct >= 0 },
                  { label: 'Annual Return', value: fmtPct(result.annual_return_pct), pos: result.annual_return_pct >= 0 },
                  { label: 'Sharpe Ratio', value: result.sharpe_ratio.toFixed(2), pos: result.sharpe_ratio >= 1 },
                  { label: 'Max Drawdown', value: fmtPct(result.max_drawdown_pct), pos: false },
                  { label: 'Win Rate', value: `${result.win_rate.toFixed(1)}%`, pos: result.win_rate >= 50 },
                  { label: 'Profit Factor', value: result.profit_factor.toFixed(2), pos: result.profit_factor >= 1 },
                  { label: 'Sortino', value: result.sortino_ratio.toFixed(2), pos: result.sortino_ratio >= 1 },
                  { label: 'Total Trades', value: result.num_trades, pos: null },
                ].map(({ label, value, pos }) => (
                  <div key={label} className="card-sm">
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className={clsx(
                      'text-lg font-bold font-mono mt-1',
                      pos === true ? 'text-accent-green' : pos === false ? 'text-accent-red' : 'text-white',
                    )}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Equity Curve */}
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Equity Curve</h3>
                <EquityCurveChart
                  data={result.equity_curve}
                  initialCapital={form.initial_capital}
                  height={280}
                />
              </div>

              {/* Trade Log */}
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">
                  Trade Log ({result.trades.length} trades)
                </h3>
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-border">
                        <th className="text-left pb-2 pr-3">Entry</th>
                        <th className="text-left pb-2 pr-3">Exit</th>
                        <th className="text-right pb-2 pr-3">Side</th>
                        <th className="text-right pb-2 pr-3">Entry $</th>
                        <th className="text-right pb-2 pr-3">Exit $</th>
                        <th className="text-right pb-2">PnL %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades.slice(0, 100).map((t, i) => (
                        <tr key={i} className="table-row">
                          <td className="py-1.5 pr-3 font-mono">
                            {t.entry_time?.slice(0, 10)}
                          </td>
                          <td className="py-1.5 pr-3 font-mono">
                            {t.exit_time?.slice(0, 10) ?? '—'}
                          </td>
                          <td className="text-right pr-3">
                            <span className={t.side === 'long' ? 'text-accent-green' : 'text-accent-red'}>
                              {t.side?.toUpperCase()}
                            </span>
                          </td>
                          <td className="text-right pr-3 font-mono">{t.entry_price?.toFixed(4)}</td>
                          <td className="text-right pr-3 font-mono">{t.exit_price?.toFixed(4) ?? '—'}</td>
                          <td className={clsx('text-right font-mono', pnlClass(t.pnl_pct))}>
                            {t.pnl_pct >= 0 ? '+' : ''}{t.pnl_pct?.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
