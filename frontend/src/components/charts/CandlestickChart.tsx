import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
} from 'lightweight-charts'
import api from '../../utils/api'

interface CandlestickChartProps {
  symbol: string
  assetClass?: string
  timeframe?: string
  height?: number
}

export default function CandlestickChart({
  symbol,
  assetClass = 'crypto',
  timeframe = '1h',
  height = 400,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0d1117' },
        textColor: '#8b949e',
      },
      grid: {
        vertLines: { color: '#21262d' },
        horzLines: { color: '#21262d' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#30363d' },
      timeScale: {
        borderColor: '#30363d',
        timeVisible: true,
        secondsVisible: false,
      },
    })
    chartRef.current = chart

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#3fb950',
      downColor: '#f85149',
      borderUpColor: '#3fb950',
      borderDownColor: '#f85149',
      wickUpColor: '#3fb950',
      wickDownColor: '#f85149',
    })
    candleRef.current = candleSeries

    const volSeries = chart.addHistogramSeries({
      color: '#58a6ff',
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    })
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
    volumeRef.current = volSeries

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [height])

  // Fetch data when symbol/timeframe changes
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current) return
    setLoading(true)
    setError(null)

    api.get('/market/ohlcv', { params: { symbol, asset_class: assetClass, timeframe, limit: 300 } })
      .then(({ data }) => {
        const candles: CandlestickData[] = data.data.map((d: {
          timestamp: string; open: number; high: number; low: number; close: number; volume: number
        }) => ({
          time: Math.floor(new Date(d.timestamp).getTime() / 1000) as CandlestickData['time'],
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }))
        const volumes = data.data.map((d: {
          timestamp: string; close: number; open: number; volume: number
        }) => ({
          time: Math.floor(new Date(d.timestamp).getTime() / 1000),
          value: d.volume,
          color: d.close >= d.open ? 'rgba(63,185,80,0.4)' : 'rgba(248,81,73,0.4)',
        }))

        candleRef.current?.setData(candles)
        volumeRef.current?.setData(volumes)
        chartRef.current?.timeScale().fitContent()
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [symbol, assetClass, timeframe])

  return (
    <div className="relative tv-chart" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/60 z-10">
          <div className="text-accent-blue text-sm animate-pulse">Loading chart…</div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-10">
          <div className="text-accent-red text-sm">{error}</div>
        </div>
      )}
      <div ref={containerRef} style={{ height }} />
    </div>
  )
}
