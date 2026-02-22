import axios from 'axios'

// Prefer runtime override from Settings page, then build-time env var, then localhost
const BASE_URL =
  localStorage.getItem('VITE_API_URL') ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:8000/api/v1'

const api = axios.create({ baseURL: BASE_URL, timeout: 15_000 })

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // Token expired — clear storage and redirect
      localStorage.removeItem('quant-auth')
      window.location.href = `${import.meta.env.BASE_URL}login`
    }
    return Promise.reject(err)
  },
)

export default api
