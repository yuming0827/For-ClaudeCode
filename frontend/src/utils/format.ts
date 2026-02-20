export function fmtPct(v: number, decimals = 2): string {
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(decimals)}%`
}

export function fmtPrice(v: number, decimals = 4): string {
  return v.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtUSD(v: number): string {
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function fmtCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(2)}K`
  return v.toFixed(2)
}

export function pnlClass(v: number): string {
  if (v > 0) return 'stat-positive'
  if (v < 0) return 'stat-negative'
  return 'stat-neutral'
}

export function statusBadge(status: string): string {
  switch (status) {
    case 'running': return 'badge-green'
    case 'paused':  return 'badge-yellow'
    case 'stopped': return 'badge-gray'
    case 'error':   return 'badge-red'
    default:        return 'badge-gray'
  }
}
