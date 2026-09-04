const BASE_URL = import.meta.env.VITE_API_URL || '/api'

class ApiClient {
  constructor() {
    this.baseUrl = BASE_URL
    this._getToken = null
    this._refreshFn = null
    this._isRefreshing = false
    this._refreshPromise = null
  }

  setTokenGetter(fn) {
    this._getToken = fn
  }

  setRefreshFn(fn) {
    this._refreshFn = fn
  }

  async request(endpoint, options = {}) {
    const skipAuth = options._skipAuth
    delete options._skipAuth

    const token = skipAuth ? null : (this._getToken?.() ?? null)

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    })

    if (response.status === 401 && !skipAuth && this._refreshFn) {
      if (this._isRefreshing && this._refreshPromise) {
        const newToken = await this._refreshPromise
        if (newToken) {
          return this.request(endpoint, { ...options, _skipAuth: false })
        }
      }

      this._isRefreshing = true
      this._refreshPromise = this._refreshFn()

      try {
        const newToken = await this._refreshPromise
        if (newToken) {
          const retryHeaders = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${newToken}`,
            ...options.headers,
          }
          const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: retryHeaders,
            credentials: 'include',
          })
          if (!retryResponse.ok) {
            const body = await retryResponse.json().catch(() => ({}))
            throw new Error(body.message || `Erreur API: ${retryResponse.status}`)
          }
          if (retryResponse.status === 204) return null
          return retryResponse.json()
        }
      } finally {
        this._isRefreshing = false
        this._refreshPromise = null
      }

      window.location.href = '/'
      throw new Error('Session expirée, veuillez vous reconnecter.')
    }

    if (response.status === 401 && !skipAuth) {
      window.location.href = '/'
      throw new Error('Session expirée, veuillez vous reconnecter.')
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.message || `Erreur API: ${response.status}`)
    }

    if (response.status === 204) return null
    return response.json()
  }

  get(endpoint) {
    return this.request(endpoint)
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    })
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    })
  }

  patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    })
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options })
  }
}

export const apiClient = new ApiClient()
