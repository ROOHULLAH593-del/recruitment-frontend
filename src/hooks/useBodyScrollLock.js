import { useEffect } from 'react'

// Module-level, not component state: several independent overlays can be
// locked at once (e.g. a ConfirmDialog opened from HrInvitationsPanel while
// SettingsPanel itself is open behind it), and each must be able to close
// without unlocking scroll for the other(s) still open. A plain per-component
// `overflow = 'hidden'` / `overflow = ''` toggle is exactly the bug this
// replaces: whichever one unmounts last "wins" only by accident, and closing
// the wrong one first silently unlocks the background under a modal that's
// still open. Reference-counting instead makes the lock correct regardless
// of how many callers hold it or the order they mount/unmount in.
let lockCount = 0

/**
 * Locks page scroll for as long as this hook is called with `isLocked: true`
 * from a mounted component. Safe to call from multiple components at once,
 * including nested ones (a modal opened from within another modal).
 */
export function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return

    lockCount += 1
    if (lockCount === 1) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      lockCount -= 1
      if (lockCount === 0) {
        document.body.style.overflow = ''
      }
    }
  }, [isLocked])
}
