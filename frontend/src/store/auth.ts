import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../utils/api'

interface AuthState {
  token: string | null
  username: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,

      login: async (username, password) => {
        const form = new URLSearchParams()
        form.append('username', username)
        form.append('password', password)
        const { data } = await api.post('/auth/login', form, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        set({ token: data.access_token, username })
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
      },

      logout: () => {
        set({ token: null, username: null })
        delete api.defaults.headers.common['Authorization']
      },
    }),
    {
      name: 'quant-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
        }
      },
    },
  ),
)
