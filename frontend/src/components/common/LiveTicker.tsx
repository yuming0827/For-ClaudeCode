import { useEffect, useState } from 'react'
import { clsx } from 'clsx'

interface TickData {
  symbol: string
  price: number
  change: number
}

const DEMO_TICKERS: TickData[] = [
  { symbol: 'BTC/USDT', price: 67_420, change: 1.24 },
  { symbol: 'ETH/USDT', price: 3_512, change: -0.83 },
  { symbol: 'SOL/USDT', price: 178.4, change: 3.12 },
  { symbol: 'AAPL',     price: 213.5, change: 0.55 },
  { symbol: 'TSLA',     price: 242.1, change: -1.70 },
  { symbol: 'NVDA',     price: 905.2, change: 2.31 },
  { symbol: '2330.TW',  price: 945,   change: 1.07 },
]

export default function LiveTicker() {
  const [tickers, setTickers] = useState<TickData[]>(DEMO_TICKERS)

  // Simulate live price movement
  useEffect(() => {
    const id = setInterval(() => {
      setTickers((prev) =>
        prev.map((t) => ({
          ...t,
          price: +(t.price * (1 + (Math.random() - 0.49) * 0.001)).toFixed(t.price > 100 ? 2 : 4),
          change: +(t.change + (Math.random() - 0.5) * 0.05).toFixed(2),
        })),
      )
    }, 1500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="bg-surface-100 border-b border-border overflow-hidden h-8 flex items-center">
      <div className="animate-[scroll_30s_linear_infinite] flex gap-8 whitespace-nowrap px-4">
        {[...tickers, ...tickers].map((t, i) => (
          <span key={i} className="text-xs font-mono flex items-center gap-2">
            <span className="text-gray-400">{t.symbol}</span>
            <span className="text-white font-semibold">{t.price.toLocaleString()}</span>
            <span className={clsx('text-xs', t.change >= 0 ? 'text-accent-green' : 'text-accent-red')}>
              {t.change >= 0 ? '+' : ''}{t.change.toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
