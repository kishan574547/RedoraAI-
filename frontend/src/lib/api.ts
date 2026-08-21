import axios from 'axios'

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let url = envUrl.trim().replace(/\/$/, '')
    if (url.endsWith('/api/v1')) {
      url = url.substring(0, url.length - 7)
    }
    return url
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    console.warn('[Redora AI API] VITE_API_BASE_URL is not set in Vercel environment settings. API calls may fail with 405 Method Not Allowed if routed to Vercel static origin.')
  }
  return ''
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to attach token, format URLs, and handle FormData boundaries
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type']
    delete config.headers['content-type']
  }

  if (config.url && !config.url.startsWith('http://') && !config.url.startsWith('https://')) {
    let path = config.url.startsWith('/') ? config.url : `/${config.url}`
    if (!path.startsWith('/api/v1')) {
      config.url = `/api/v1${path}`
    } else {
      config.url = path
    }
  }

  const token = localStorage.getItem('access_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
