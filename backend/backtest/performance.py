"""
Performance analytics: Sharpe, Sortino, Calmar, MDD, VaR, CVaR, etc.
"""
import numpy as np
import pandas as pd
from typing import List, Any, Dict


def compute_metrics(
    equity: pd.Series,
    trades: List[Any],
    initial_capital: float,
    risk_free_rate: float = 0.04,   # 4 % annual
) -> Dict[str, Any]:
    eq = equity.dropna()
    if len(eq) < 2:
        return _empty_metrics()

    returns = eq.pct_change().dropna()
    daily_rf = (1 + risk_free_rate) ** (1 / 252) - 1

    # ── Core metrics ────────────────────────────────────────────────────────
    total_return = (eq.iloc[-1] - initial_capital) / initial_capital
    n_years = max(len(returns) / 252, 1 / 252)
    annual_return = (1 + total_return) ** (1 / n_years) - 1

    excess = returns - daily_rf
    sharpe = (excess.mean() / excess.std() * np.sqrt(252)) if excess.std() > 0 else 0.0

    downside = returns[returns < daily_rf]
    sortino_denom = np.sqrt((downside**2).mean()) * np.sqrt(252) if len(downside) > 0 else 1e-9
    sortino = excess.mean() * 252 / sortino_denom if sortino_denom > 0 else 0.0

    # ── Drawdown ─────────────────────────────────────────────────────────────
    rolling_max = eq.cummax()
    drawdown = (eq - rolling_max) / rolling_max
    max_dd = drawdown.min()
    drawdown_curve = [
        {"timestamp": str(ts), "drawdown": round(float(dd) * 100, 4)}
        for ts, dd in drawdown.items()
    ]

    calmar = annual_return / abs(max_dd) if max_dd != 0 else 0.0

    # ── VaR / CVaR (historical, 95%) ────────────────────────────────────────
    var_95 = float(np.percentile(returns, 5))
    cvar_95 = float(returns[returns <= var_95].mean()) if len(returns[returns <= var_95]) > 0 else var_95

    # ── Trade statistics ─────────────────────────────────────────────────────
    closed = [t for t in trades if getattr(t, "is_closed", False) or t.get("exit_price") is not None]
    pnls = [t.pnl if hasattr(t, "pnl") else t.get("pnl", 0) for t in closed]
    n_trades = len(pnls)
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p <= 0]
    win_rate = len(wins) / n_trades if n_trades > 0 else 0.0
    avg_win = np.mean(wins) if wins else 0.0
    avg_loss = abs(np.mean(losses)) if losses else 1e-9
    profit_factor = (sum(wins) / abs(sum(losses))) if sum(losses) != 0 else float("inf")

    pnl_pcts = [
        t.pnl_pct if hasattr(t, "pnl_pct") else t.get("pnl_pct", 0) / 100
        for t in closed
    ]

    return {
        "total_return_pct": round(total_return * 100, 4),
        "annual_return_pct": round(annual_return * 100, 4),
        "sharpe_ratio": round(float(sharpe), 4),
        "sortino_ratio": round(float(sortino), 4),
        "calmar_ratio": round(float(calmar), 4),
        "max_drawdown_pct": round(float(max_dd) * 100, 4),
        "win_rate": round(win_rate * 100, 2),
        "profit_factor": round(float(profit_factor), 4),
        "avg_trade_pct": round(float(np.mean(pnl_pcts) * 100), 4) if pnl_pcts else 0.0,
        "num_trades": n_trades,
        "num_wins": len(wins),
        "num_losses": len(losses),
        "best_trade_pct": round(float(max(pnl_pcts) * 100), 4) if pnl_pcts else 0.0,
        "worst_trade_pct": round(float(min(pnl_pcts) * 100), 4) if pnl_pcts else 0.0,
        "avg_holding_days": 0.0,   # computed externally
        "var_95": round(var_95 * 100, 4),
        "cvar_95": round(cvar_95 * 100, 4),
        "drawdown_curve": drawdown_curve,
    }


def _empty_metrics() -> Dict[str, Any]:
    keys = [
        "total_return_pct", "annual_return_pct", "sharpe_ratio", "sortino_ratio",
        "calmar_ratio", "max_drawdown_pct", "win_rate", "profit_factor",
        "avg_trade_pct", "num_trades", "num_wins", "num_losses",
        "best_trade_pct", "worst_trade_pct", "avg_holding_days",
        "var_95", "cvar_95",
    ]
    return {k: 0.0 for k in keys} | {"drawdown_curve": [], "equity_curve": [], "trades": []}
