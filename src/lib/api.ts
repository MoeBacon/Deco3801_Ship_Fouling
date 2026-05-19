import axios from 'axios'
import { clearAuthSession, readAuthSession } from '../features/auth/session'

export const api = axios.create({
  baseURL:
    typeof import.meta.env.VITE_API_BASE_URL === 'string'
      ? import.meta.env.VITE_API_BASE_URL
      : '/api/v1',
})

api.interceptors.request.use((config) => {
  const session = readAuthSession()
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuthSession()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
