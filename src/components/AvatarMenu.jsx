import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

function initialsOf(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

// "Settings" opens the settings panel's Profile tab rather than navigating to
// a route — hr/admin accounts don't have a standalone /profile page (only
// candidates do), so this keeps the dropdown's behavior identical for every
// role instead of routing candidates one way and hr/admin another.
export default function AvatarMenu({ onOpenProfile }) {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false)
    }
    function handleEscape(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <motion.button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-jade text-sm font-semibold text-[var(--color-on-jade,_white)]"
        aria-label="Account menu"
        aria-expanded={isOpen}
      >
        {initialsOf(user.name)}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-lg border border-ink/10 bg-surface-elevated py-1 shadow-lg"
          >
            <div className="border-b border-ink/10 px-3 py-2">
              <p className="truncate text-sm font-medium text-ink">{user.name}</p>
              <p className="text-xs capitalize text-ink/50">{user.role}</p>
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false)
                onOpenProfile()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-ink/5"
            >
              <Settings size={15} />
              Settings
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false)
                logout()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rust hover:bg-rust-tint"
            >
              <LogOut size={15} />
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
