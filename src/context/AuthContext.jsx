import { useCallback, useEffect, useState } from 'react'
import api, { TOKEN_STORAGE_KEY } from '../lib/axios'
import { queryClient } from '../lib/queryClient'
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
    // A forced logout (expired/invalid token) still leaves this session's
    // cached data sitting around — clear it so nothing from this account
    // lingers if a different user signs in on the same tab afterward.
    const handleUnauthorized = () => {
      queryClient.clear()
      setUser(null)
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)

    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  const login = useCallback(async (identifier, password) => {
    const { data } = await api.post('/login', { identifier, password })

    // None of this app's query keys are scoped by user id (['profile'],
    // ['applications', 'mine', page], etc.), so without this, signing in as
    // a different account in the same tab would show the previous account's
    // cached data instantly before a background refetch caught up.
    queryClient.clear()
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
    setUser(data.user)

    return data.user
  }, [])

  // No token/auto-login here — the backend deliberately doesn't issue one
  // on registration (a candidate's first CNIC/password shouldn't be
  // auto-trusted the moment it's typed in), so this just performs the
  // signup and leaves auth state untouched. RegisterPage sends the
  // candidate to /login afterward.
  const register = useCallback(async ({ name, email, username, cnic, password, password_confirmation }) => {
    await api.post('/register', {
      name,
      email,
      username,
      cnic,
      password,
      password_confirmation,
    })
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } catch {
      // Token may already be invalid; clear local state regardless.
    } finally {
      // Wipe cached data so it can't reappear for whoever uses this tab next.
      queryClient.clear()
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
