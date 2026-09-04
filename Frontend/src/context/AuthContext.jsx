import { createContext, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { apiClient } from '../services/apiClient'

export const AuthContext = createContext(null)

const AUTH_STORAGE_KEY = 'madalogistics_auth'

function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1]
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function extractRoleFromToken(token) {
  const payload = decodeJwtPayload(token)
  return payload?.role || null
}

function loadAuthFromStorage() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      if (data.token && data.user) {
        const payload = decodeJwtPayload(data.token)
        if (payload?.exp && Date.now() < payload.exp * 1000) {
          return data
        }
      }
    }
  } catch {
    // Invalid storage data
  }
  return null
}

function saveAuthToStorage(token, user) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }))
  } catch {
    // Storage full or unavailable
  }
}

function clearAuthFromStorage() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // Ignore
  }
}

export function AuthProvider({ children }) {
  const initialAuth = loadAuthFromStorage()
  const [user, setUser] = useState(initialAuth?.user || null)
  const tokenRef = useRef(initialAuth?.token || null)
  const [, forceUpdate] = useState(0)

  const setAccessToken = useCallback((token) => {
    tokenRef.current = token
    forceUpdate((n) => n + 1)
  }, [])

  const getAccessToken = useCallback(() => tokenRef.current, [])

  const login = useCallback(async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password })
    const rawToken = res.token || res.accessToken
    const { utilisateurId, tenantId, email: userEmail, fullName, redirectPath } = res
    tokenRef.current = rawToken
    const role = extractRoleFromToken(rawToken)
    const userData = { utilisateurId, tenantId, email: userEmail, name: fullName, role, redirectPath }
    setUser(userData)
    forceUpdate((n) => n + 1)
    saveAuthToStorage(rawToken, userData)
    return userData
  }, [])

  const register = useCallback(async (data) => {
    const res = await apiClient.post('/auth/inscription', data)
    const rawToken = res.token || res.accessToken
    const { utilisateurId, tenantId, email: userEmail, fullName, redirectPath } = res
    tokenRef.current = rawToken
    const role = extractRoleFromToken(rawToken)
    const userData = { utilisateurId, tenantId, email: userEmail, name: fullName, role, redirectPath }
    setUser(userData)
    forceUpdate((n) => n + 1)
    saveAuthToStorage(rawToken, userData)
    return userData
  }, [])

  const refreshAccessToken = useCallback(async () => {
    try {
      const res = await apiClient.post('/auth/refresh', {}, { _skipAuth: true })
      if (res?.token || res?.accessToken) {
        const newToken = res.token || res.accessToken
        tokenRef.current = newToken
        forceUpdate((n) => n + 1)
        if (user) {
          saveAuthToStorage(newToken, user)
        }
        return res.accessToken
      }
    } catch {
      // Refresh failed — user must re-login
    }
    return null
  }, [user])

  const logout = useCallback(async () => {
    try {
      console.log('LOGOUT - calling /auth/logout')
      const res = await apiClient.post('/auth/logout', {}, { _skipAuth: true })
      console.log('LOGOUT - response:', res)
    } catch (err) {
      console.log('LOGOUT - error:', err)
    }
    tokenRef.current = null
    setUser(null)
    forceUpdate((n) => n + 1)
    clearAuthFromStorage()
    console.log('LOGOUT - state cleared')
  }, [])

  const isTokenExpired = useCallback(() => {
    const token = tokenRef.current
    if (!token) return true
    const payload = decodeJwtPayload(token)
    if (!payload?.exp) return false
    return Date.now() >= payload.exp * 1000
  }, [])

  const getRoleFromToken = useCallback(() => {
    return extractRoleFromToken(tokenRef.current)
  }, [])

  useEffect(() => {
    apiClient.setTokenGetter(getAccessToken)
    apiClient.setRefreshFn(refreshAccessToken)
  }, [getAccessToken, refreshAccessToken])

  const value = useMemo(() => ({
    user,
    getAccessToken,
    getRoleFromToken,
    login,
    register,
    logout,
    refreshAccessToken,
    isTokenExpired,
    isAuthenticated: !!user,
  }), [user, getAccessToken, getRoleFromToken, login, register, logout, refreshAccessToken, isTokenExpired])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
