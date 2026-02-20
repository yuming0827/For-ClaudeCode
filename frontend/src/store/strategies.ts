import { create } from 'zustand'
import api from '../utils/api'

export interface Strategy {
  id: string
  name: string
  strategy_type: string
  symbol: string
  asset_class: string
  status: string
  pnl: number
  pnl_pct: number
  position: number
  entry_price: number | null
  current_price: number
  unrealized_pnl: number
  realized_pnl: number
  num_trades: number
  win_rate: number
  sharpe_ratio: number
  max_drawdown: number
  var_95: number
  started_at: string
  updated_at: string
  params: Record<string, unknown>
}

interface StrategyStore {
  strategies: Strategy[]
  loading: boolean
  fetchStrategies: () => Promise<void>
  addStrategy: (params: Record<string, unknown>) => Promise<Strategy>
  stopStrategy: (id: string) => Promise<void>
  updateStrategy: (id: string, params: Record<string, unknown>) => Promise<void>
  setFromWS: (data: Strategy[]) => void
}

export const useStrategyStore = create<StrategyStore>((set) => ({
  strategies: [],
  loading: false,

  fetchStrategies: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/strategies')
      set({ strategies: data })
    } finally {
      set({ loading: false })
    }
  },

  addStrategy: async (params) => {
    const { data } = await api.post('/strategies', params)
    set((s) => ({ strategies: [...s.strategies, data] }))
    return data
  },

  stopStrategy: async (id) => {
    await api.delete(`/strategies/${id}`)
    set((s) => ({
      strategies: s.strategies.map((st) =>
        st.id === id ? { ...st, status: 'stopped' } : st,
      ),
    }))
  },

  updateStrategy: async (id, params) => {
    const { data } = await api.patch(`/strategies/${id}`, params)
    set((s) => ({
      strategies: s.strategies.map((st) => (st.id === id ? data : st)),
    }))
  },

  setFromWS: (data) => set({ strategies: data }),
}))
