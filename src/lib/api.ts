import axios from 'axios'

export const api = axios.create({
  baseURL:
    typeof import.meta.env.VITE_API_BASE_URL === 'string'
      ? import.meta.env.VITE_API_BASE_URL
      : '/api/v1',
})
