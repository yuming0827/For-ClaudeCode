import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'

interface Point { timestamp: string; equity: number }

interface Props {
  data: Point[]
  initialCapital: number
  height?: number
}

export default function EquityCurveChart({ data, initialCapital, height = 300 }: Props) {
  const min = Math.min(...data.map((d) => d.equity))
  const max = Math.max(...data.map((d) => d.equity))
  const final = data.at(-1)?.equity ?? initialCapital
  const isPositive = final >= initialCapital

  const formatted = data.map((d) => ({
    ...d,
    date: format(new Date(d.timestamp), 'MM/dd'),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={isPositive ? '#3fb950' : '#f85149'} stopOpacity={0.3} />
            <stop offset="95%" stopColor={isPositive ? '#3fb950' : '#f85149'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
        <XAxis dataKey="date" tick={{ fill: '#8b949e', fontSize: 11 }} tickLine={false} />
        <YAxis
          domain={[min * 0.995, max * 1.005]}
          tick={{ fill: '#8b949e', fontSize: 11 }}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: '#8b949e' }}
          formatter={(v: number) => [`$${v.toLocaleString()}`, 'Equity']}
        />
        <ReferenceLine y={initialCapital} stroke="#484f58" strokeDasharray="4 4" />
        <Area
          type="monotone"
          dataKey="equity"
          stroke={isPositive ? '#3fb950' : '#f85149'}
          strokeWidth={2}
          fill="url(#eqGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
