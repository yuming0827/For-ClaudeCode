import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import CandlestickChart from '../components/charts/CandlestickChart'
import api from '../utils/api'

interface Indicators {
  rsi_14: number; macd: number; macd_signal: number; macd_hist: number
  bb_upper: number; bb_middle: number; bb_lower: number; bb_pct: number
  atr_14: number; adx: number; z_score: number; close: number
}

const SYMBOLS = [
  { label: 'BTC/USDT', value: 'BTC/USDT', asset: 'crypto' },
  { label: 'ETH/USDT', value: 'ETH/USDT', asset: 'crypto' },
  { label: 'SOL/USDT', value: 'SOL/USDT', asset: 'crypto' },
  { label: 'AAPL', value: 'AAPL', asset: 'us_stock' },
  { label: 'TSLA', value: 'TSLA', asset: 'us_stock' },
  { label: 'NVDA', value: 'NVDA', asset: 'us_stock' },
]

export default function MarketPage() {
  const [symbol, setSymbol] = useState('BTC/USDT')
  const [assetClass, setAssetClass] = useState('crypto')
  const [timeframe, setTimeframe] = useState('1h')
  const [indicators, setIndicators] = useState<Indicators | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchIndicators = useCallback(() => {
    setLoading(true)
    api.get('/market/indicators', {
      params: { symbol, asset_class: assetClass, timeframe },
    })
      .then(({ data }) => setIndicators(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [symbol, assetClass, timeframe])

  useEffect(() => { fetchIndicators() }, [fetchIndicators])

  const selectSymbol = (sym: string, asset: string) => {
    setSymbol(sym)
    setAssetClass(asset)
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-white">Market</h1>
        <div className="flex gap-2 flex-wrap">
          {SYMBOLS.map((s) => (
            <button
              key={s.value}
              onClick={() => selectSymbol(s.value, s.asset)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                symbol === s.value
                  ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-surface-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeframe */}
      <div className="flex items-center gap-2">
        {['1m','5m','15m','1h','4h','1d'].map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
              timeframe === tf
                ? 'bg-surface-200 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tf}
          </button>
        ))}
        <button onClick={fetchIndicators} disabled={loading}
          className="ml-auto btn-ghost p-1.5">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Chart */}
      <CandlestickChart
        symbol={symbol}
        assetClass={assetClass}
        timeframe={timeframe}
        height={450}
      />

      {/* Indicators Panel */}
      {indicators && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Price', value: indicators.close.toFixed(4), color: 'text-white' },
            { label: 'RSI 14', value: indicators.rsi_14?.toFixed(2),
              color: indicators.rsi_14 > 70 ? 'text-accent-red' : indicators.rsi_14 < 30 ? 'text-accent-green' : 'text-white' },
            { label: 'MACD', value: indicators.macd?.toFixed(4),
              color: indicators.macd > 0 ? 'text-accent-green' : 'text-accent-red' },
            { label: 'BB %B', value: indicators.bb_pct?.toFixed(3),
              color: indicators.bb_pct > 0.8 ? 'text-accent-red' : indicators.bb_pct < 0.2 ? 'text-accent-green' : 'text-white' },
            { label: 'ATR 14', value: indicators.atr_14?.toFixed(4), color: 'text-accent-yellow' },
            { label: 'ADX', value: indicators.adx?.toFixed(2),
              color: indicators.adx > 25 ? 'text-accent-green' : 'text-gray-400' },
            { label: 'Z-Score', value: indicators.z_score?.toFixed(3),
              color: Math.abs(indicators.z_score) > 2 ? 'text-accent-red' : 'text-white' },
            { label: 'BB Upper', value: indicators.bb_upper?.toFixed(4), color: 'text-gray-400' },
            { label: 'BB Lower', value: indicators.bb_lower?.toFixed(4), color: 'text-gray-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card-sm">
              <div className="text-xs text-gray-500">{label}</div>
              <div className={`text-sm font-mono font-semibold mt-1 ${color}`}>{value ?? '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
