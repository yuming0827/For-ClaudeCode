import axios from 'axios'
import { installMockAdapter } from './mockData'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

// Demo mode: active when env flag is set OR when running on GitHub Pages
// without a real backend configured.
const isDemoMode =
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  (!import.meta.env.VITE_API_URL && window.location.hostname !== 'localhost')

const api = axios.create({ baseURL: BASE_URL, timeout: 15_000 })

if (isDemoMode) {
  installMockAdapter(api)
  console.info('[QuantAgent] Demo mode active — using mock data.')
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !isDemoMode) {
      localStorage.removeItem('quant-auth')
      window.location.href = `${import.meta.env.BASE_URL}login`
    }
    return Promise.reject(err)
  },
)

export { isDemoMode }
export default api
