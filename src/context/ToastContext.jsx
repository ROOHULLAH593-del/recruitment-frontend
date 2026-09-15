import { useCallback, useState } from 'react'
import ToastContainer from '../components/ToastContainer'
import { ToastContext } from './toast-context'

const DEFAULT_DURATION_MS = 4000

// Incrementing id is enough here — toasts are transient, in-memory, and
// never persisted or reconciled across renders the way a list key from data
// would need to be.
let nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismissToast = useCallback((id) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
  }, [])

  // variant: 'positive' | 'caution' | 'negative' | 'info' (default)
  const showToast = useCallback(
    (message, variant = 'info', duration = DEFAULT_DURATION_MS) => {
      const id = ++nextId
      setToasts((previous) => [...previous, { id, message, variant }])

      if (duration > 0) {
        setTimeout(() => dismissToast(id), duration)
      }

      return id
    },
    [dismissToast],
  )

  const value = { showToast, dismissToast }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}
