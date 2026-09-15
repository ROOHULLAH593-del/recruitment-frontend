import { useCallback, useEffect, useState } from 'react'
import api, { TOKEN_STORAGE_KEY } from '../lib/axios'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)))

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_STORAGE_KEY)) {
      return
    }

    let isCancelled = false

    api
      .get('/user')
      .then(({ data }) => {
        if (!isCancelled) {
          setUser(data.user)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          localStorage.removeItem(TOKEN_STORAGE_KEY)
          setUser(null)
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => setUser(null)

    window.addEventListener('auth:unauthorized', handleUnauthorized)

    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/login', { email, password })

    localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
    setUser(data.user)

    return data.user
  }, [])

  const register = useCallback(async ({ name, email, password, password_confirmation }) => {
    const { data } = await api.post('/register', {
      name,
      email,
      password,
      password_confirmation,
    })

    localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
    setUser(data.user)

    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } catch {
      // Token may already be invalid; clear local state regardless.
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      setUser(null)
    }
  }, [])

  const value = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
