# Quant Agent — Professional Multi-Asset Quantitative Trading Dashboard

A full-stack quantitative trading system for professional traders, supporting crypto, US equities, and Taiwan stocks with real-time monitoring, algorithmic strategies, Telegram notifications, and a web-based dashboard deployable on GitHub Pages.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│  GitHub Pages │ Dark Mode │ Lightweight Charts       │
│  Dashboard │ Strategy Editor │ Backtest UI           │
└───────────────────────┬─────────────────────────────┘
                        │ REST + WebSocket
┌───────────────────────▼─────────────────────────────┐
│                  Backend (FastAPI)                   │
│  Quant Agent Engine │ Strategy Runner                │
│  Data Providers │ Backtest Engine │ Telegram Bot     │
└────────────┬─────────────────────┬──────────────────┘
             │                     │
    ┌────────▼───────┐   ┌────────▼────────┐
    │  TimescaleDB   │   │      Redis       │
    │  (OHLCV data)  │   │  (pub/sub cache) │
    └────────────────┘   └─────────────────┘
```

## Features

### Core Trading Engine
- **Trend Following**: EMA crossover + ADX filter + ATR trailing stop
- **Mean Reversion**: Z-Score + Bollinger Bands + RSI confirmation
- **Event-Driven**: Volume surge, price gap, institutional activity triggers
- **Hot Parameter Reload**: Change stop-loss/take-profit without restarting

### Technical Indicators
- RSI, MACD, Bollinger Bands, VWAP, ATR, ADX
- Z-Score, Volatility Squeeze (TTM), Order Flow Imbalance
- Statistical Arbitrage Z-Score, Hurst Exponent, Institutional Chip Analysis

### Market Data
| Market | Provider |
|--------|----------|
| Crypto | Binance / OKX (ccxt) |
| US Stocks | yfinance (free) / Polygon.io (premium) |
| Taiwan Stocks | TWSE Open API + Institutional Activity |

### Backtesting
- Minute-to-daily bar resolution
- Accounts for commission, slippage, and position sizing
- Metrics: Total Return, Annual Return, Sharpe, Sortino, Calmar, MDD, Win Rate, Profit Factor, VaR 95%, CVaR 95%
- Interactive equity curve + trade log in UI

### Notifications (Telegram Bot)
| Command | Action |
|---------|--------|
| `/status` | All positions & PnL |
| `/stop <id>` | Emergency close strategy |
| `/strategies` | List running strategies |
| `/help` | Show all commands |

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env   # fill in your API keys
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

### 3. Docker (recommended)

```bash
cp backend/.env.example backend/.env  # fill in your keys
docker-compose up -d
```

Demo credentials: `admin` / `quantadmin2024`

---

## GitHub Pages Deployment

1. Fork this repository
2. Go to **Settings → Pages → Source → GitHub Actions**
3. Set repository variables:
   - `VITE_API_URL` → your backend URL (e.g. `https://api.yourdomain.com/api/v1`)
   - `VITE_WS_URL` → your WebSocket URL
4. Push to `main` — the dashboard deploys automatically

---

## Security

- API keys are stored in `.env` (server-side only) — never in the frontend
- JWT authentication for the web dashboard
- All sensitive settings are loaded via `pydantic-settings`
- `.gitignore` explicitly excludes `.env` files

---

## Project Structure

```
.
├── backend/
│   ├── agents/         # Quant agent orchestrator
│   ├── api/            # FastAPI routes & WebSocket
│   ├── backtest/       # Backtesting engine + metrics
│   ├── data/           # Crypto, US stock, TW stock data
│   ├── indicators/     # Technical + advanced indicators
│   ├── models/         # Pydantic schemas
│   ├── notifications/  # Telegram bot
│   ├── strategies/     # Trend, mean reversion, event-driven
│   ├── config.py
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/ # Charts, dashboard, strategy UI
│   │   ├── hooks/      # WebSocket hook
│   │   ├── pages/      # Dashboard, Strategies, Backtest, Market, Settings
│   │   ├── store/      # Zustand state management
│   │   └── utils/      # API client, formatters
│   ├── tailwind.config.js
│   └── vite.config.ts
├── .github/workflows/  # GitHub Pages CI/CD
├── docker-compose.yml
└── README.md
```

## Roadmap

- [x] Phase 1 — Python core engine + Telegram bot
- [x] Phase 2 — React dashboard on GitHub Pages
- [x] Phase 3 — Backtesting engine with UI
- [x] Phase 4 — Multi-asset (Crypto, US, TW stocks)
- [ ] Phase 5 — Real order execution (paper trading mode)
- [ ] Phase 6 — ML-based signal generation
- [ ] Phase 7 — Portfolio optimization (Markowitz / Black-Litterman)
