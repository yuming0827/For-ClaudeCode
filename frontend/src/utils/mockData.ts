/**
 * Mock API layer — generates realistic trading data when the real backend
 * is not reachable (GitHub Pages demo mode).
 * Activated automatically when VITE_DEMO_MODE=true or backend is unavailable.
 */
import type { AxiosInstance } from 'axios'

// ── Helpers ───────────────────────────────────────────────────────────────

const rand = (min: number, max: number) => Math.random() * (max - min) + min
const randInt = (min: number, max: number) => Math.floor(rand(min, max))
const choose = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

/** Simulate network latency */
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms))

// ── OHLCV generator ───────────────────────────────────────────────────────

function generateOHLCV(
  symbol: string,
  bars = 300,
  startPrice = 50000,
  intervalMs = 3_600_000,
) {
  const data = []
  let price = startPrice
  const now = Date.now()
  for (let i = bars; i >= 0; i--) {
    const open = price
    const change = rand(-0.03, 0.03)
    const close = open * (1 + change)
    const high = Math.max(open, close) * rand(1, 1.015)
    const low = Math.min(open, close) * rand(0.985, 1)
    const volume = rand(100, 5000) * startPrice / 50000
    data.push({
      timestamp: new Date(now - i * intervalMs).toISOString(),
      open: +open.toFixed(4),
      high: +high.toFixed(4),
      low: +low.toFixed(4),
      close: +close.toFixed(4),
      volume: +volume.toFixed(2),
    })
    price = close
  }
  return data
}

// ── Equity curve generator ────────────────────────────────────────────────

function generateEquityCurve(capital: number, bars: number) {
  const data = []
  let eq = capital
  const now = Date.now()
  for (let i = bars; i >= 0; i--) {
    eq = eq * (1 + rand(-0.008, 0.012))
    data.push({
      timestamp: new Date(now - i * 86_400_000).toISOString(),
      equity: +eq.toFixed(2),
    })
  }
  return data
}

// ── Strategy factory ──────────────────────────────────────────────────────

const SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AAPL', 'TSLA', '2330']
const TYPES = ['trend_following', 'mean_reversion', 'event_driven']
const CLASSES = ['crypto', 'us_stock', 'tw_stock']

function makeStrategy(i: number) {
  const pnl = rand(-2000, 8000)
  const capital = 100_000
  return {
    id: `demo-${i}`,
    name: [`Alpha Trend`, `BTC Mean Rev`, `SOL Breakout`, `NVDA Momentum`, `TW Institutional`][i % 5],
    strategy_type: TYPES[i % 3],
    symbol: SYMBOLS[i % SYMBOLS.length],
    asset_class: CLASSES[i % 3],
    status: choose(['running', 'running', 'running', 'stopped', 'paused']),
    pnl: +pnl.toFixed(2),
    pnl_pct: +(pnl / capital * 100).toFixed(2),
    position: +rand(-1, 2).toFixed(4),
    entry_price: +rand(45000, 70000).toFixed(2),
    current_price: +rand(45000, 70000).toFixed(2),
    unrealized_pnl: +rand(-500, 1500).toFixed(2),
    realized_pnl: +rand(0, 5000).toFixed(2),
    num_trades: randInt(5, 120),
    win_rate: +rand(45, 72).toFixed(1),
    sharpe_ratio: +rand(0.5, 3.2).toFixed(2),
    max_drawdown: +rand(2, 18).toFixed(2),
    var_95: +rand(0.5, 3).toFixed(2),
    started_at: new Date(Date.now() - rand(0, 30) * 86_400_000).toISOString(),
    updated_at: new Date().toISOString(),
    params: { stop_loss_pct: 0.02, take_profit_pct: 0.04, position_size_pct: 0.1 },
  }
}

// ── Mock indicators ───────────────────────────────────────────────────────

function makeIndicators(symbol: string) {
  const close = rand(40000, 70000)
  return {
    symbol,
    timestamp: new Date().toISOString(),
    close: +close.toFixed(4),
    rsi_14: +rand(20, 80).toFixed(2),
    macd: +rand(-200, 200).toFixed(4),
    macd_signal: +rand(-200, 200).toFixed(4),
    macd_hist: +rand(-50, 50).toFixed(4),
    bb_upper: +(close * 1.02).toFixed(4),
    bb_middle: +close.toFixed(4),
    bb_lower: +(close * 0.98).toFixed(4),
    bb_pct: +rand(0, 1).toFixed(3),
    atr_14: +rand(100, 1000).toFixed(4),
    adx: +rand(10, 50).toFixed(2),
    z_score: +rand(-3, 3).toFixed(3),
    vol_squeeze: Math.random() > 0.7,
  }
}

// ── Backtest result ───────────────────────────────────────────────────────

function makeBacktestResult(capital: number) {
  const totalRet = rand(-20, 120)
  const trades = Array.from({ length: randInt(20, 80) }, (_, i) => {
    const ep = rand(40000, 70000)
    const xp = ep * (1 + rand(-0.05, 0.08))
    const pnlPct = (xp - ep) / ep * 100
    return {
      entry_time: new Date(Date.now() - rand(10, 365) * 86_400_000).toISOString(),
      exit_time: new Date(Date.now() - rand(1, 9) * 86_400_000).toISOString(),
      side: choose(['long', 'short']),
      entry_price: +ep.toFixed(2),
      exit_price: +xp.toFixed(2),
      quantity: +rand(0.01, 1).toFixed(4),
      pnl: +(xp - ep).toFixed(2),
      pnl_pct: +pnlPct.toFixed(2),
      commission: +rand(1, 20).toFixed(2),
    }
  })
  return {
    total_return_pct: +totalRet.toFixed(2),
    annual_return_pct: +(totalRet * 0.6).toFixed(2),
    sharpe_ratio: +rand(0.3, 2.8).toFixed(2),
    sortino_ratio: +rand(0.4, 3.5).toFixed(2),
    calmar_ratio: +rand(0.2, 2.0).toFixed(2),
    max_drawdown_pct: +(-rand(5, 35)).toFixed(2),
    win_rate: +rand(40, 72).toFixed(1),
    profit_factor: +rand(0.8, 2.5).toFixed(2),
    avg_trade_pct: +rand(0.5, 3).toFixed(2),
    num_trades: trades.length,
    num_wins: Math.floor(trades.length * rand(0.4, 0.72)),
    num_losses: Math.ceil(trades.length * rand(0.28, 0.6)),
    best_trade_pct: +rand(5, 25).toFixed(2),
    worst_trade_pct: +(-rand(3, 15)).toFixed(2),
    avg_holding_days: +rand(1, 14).toFixed(1),
    var_95: +(-rand(1, 5)).toFixed(2),
    cvar_95: +(-rand(2, 8)).toFixed(2),
    equity_curve: generateEquityCurve(capital, 365),
    drawdown_curve: [],
    trades,
  }
}

// ── Installed mock routes ─────────────────────────────────────────────────

let _strategies = Array.from({ length: 4 }, (_, i) => makeStrategy(i))
let _nextId = 100

export function installMockAdapter(axiosInstance: AxiosInstance) {
  // Intercept every request via adapter
  const originalAdapter = axiosInstance.defaults.adapter

  axiosInstance.defaults.adapter = async (config) => {
    const url = config.url ?? ''
    const method = (config.method ?? 'get').toLowerCase()
    await delay(rand(200, 600))

    // Auth
    if (url.includes('/auth/')) {
      const body = new URLSearchParams(config.data as string)
      const user = body.get('username') ?? 'admin'
      if (user !== 'admin' && user !== 'trader') {
        return { status: 401, data: { detail: 'Invalid credentials' }, headers: {}, config }
      }
      return { status: 200, data: { access_token: 'demo-token', token_type: 'bearer' }, headers: {}, config }
    }

    // Strategies list
    if (url.includes('/strategies') && method === 'get' && !url.match(/strategies\/[^/]+$/)) {
      // Refresh prices
      _strategies = _strategies.map((s) => ({
        ...s,
        current_price: +(s.current_price * rand(0.998, 1.002)).toFixed(4),
        updated_at: new Date().toISOString(),
      }))
      return { status: 200, data: _strategies, headers: {}, config }
    }

    // Create strategy
    if (url.includes('/strategies') && method === 'post') {
      const body = JSON.parse(config.data as string)
      const ns = { ...makeStrategy(_nextId++), ...body, id: `demo-${_nextId}`, status: 'running' }
      _strategies.push(ns)
      return { status: 200, data: ns, headers: {}, config }
    }

    // Get single strategy
    if (url.match(/\/strategies\/[^/]+$/) && method === 'get') {
      const id = url.split('/').pop()
      const s = _strategies.find((x) => x.id === id)
      if (!s) return { status: 404, data: { detail: 'Not found' }, headers: {}, config }
      return { status: 200, data: s, headers: {}, config }
    }

    // Update strategy
    if (url.match(/\/strategies\/[^/]+$/) && method === 'patch') {
      const id = url.split('/').pop()
      const patch = JSON.parse(config.data as string)
      _strategies = _strategies.map((s) => s.id === id ? { ...s, params: { ...s.params, ...patch } } : s)
      const updated = _strategies.find((s) => s.id === id)
      return { status: 200, data: updated, headers: {}, config }
    }

    // Stop strategy
    if (url.match(/\/strategies\/[^/]+$/) && method === 'delete') {
      const id = url.split('/').pop()
      _strategies = _strategies.map((s) => s.id === id ? { ...s, status: 'stopped' } : s)
      return { status: 200, data: { message: 'Stopped', status: 'stopped' }, headers: {}, config }
    }

    // OHLCV
    if (url.includes('/market/ohlcv')) {
      const params = config.params as Record<string, string>
      const sym = params?.symbol ?? 'BTC/USDT'
      const basePrice = sym.includes('USDT') ? 50000 : sym === 'AAPL' ? 200 : sym === 'TSLA' ? 250 : 180
      return {
        status: 200,
        data: { symbol: sym, timeframe: params?.timeframe ?? '1h', data: generateOHLCV(sym, 300, basePrice) },
        headers: {}, config,
      }
    }

    // Indicators
    if (url.includes('/market/indicators')) {
      const params = config.params as Record<string, string>
      return { status: 200, data: makeIndicators(params?.symbol ?? 'BTC/USDT'), headers: {}, config }
    }

    // Ticker
    if (url.includes('/market/ticker')) {
      const params = config.params as Record<string, string>
      const p = rand(40000, 70000)
      return { status: 200, data: { symbol: params?.symbol, price: +p.toFixed(2), change_pct_24h: +rand(-5, 5).toFixed(2), volume_24h: +rand(1e9, 5e10).toFixed(0) }, headers: {}, config }
    }

    // Backtest
    if (url.includes('/backtest/run')) {
      const body = JSON.parse(config.data as string)
      return { status: 200, data: makeBacktestResult(body.initial_capital ?? 100000), headers: {}, config }
    }

    // Portfolio
    if (url.includes('/portfolio')) {
      const totalPnl = _strategies.reduce((s, st) => s + st.pnl, 0)
      return {
        status: 200,
        data: {
          timestamp: new Date().toISOString(),
          total_equity: +(100000 + totalPnl).toFixed(2),
          cash: 60000,
          invested: 40000,
          total_pnl: +totalPnl.toFixed(2),
          total_pnl_pct: +(totalPnl / 100000 * 100).toFixed(4),
          daily_pnl: +rand(-500, 1000).toFixed(2),
          daily_pnl_pct: +rand(-0.5, 1).toFixed(4),
          var_95: +rand(1, 3).toFixed(2),
          positions: [],
        },
        headers: {}, config,
      }
    }

    // Fallback — pass through
    if (typeof originalAdapter === 'function') {
      return originalAdapter(config)
    }
    return { status: 404, data: {}, headers: {}, config }
  }
}
