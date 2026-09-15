import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Palette, User, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import AccountPasswordForm from './AccountPasswordForm'
import ColorCustomizer from './ColorCustomizer'
import HrInvitationsPanel from './HrInvitationsPanel'
import ThemePicker from './ThemePicker'

const BASE_TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'themes', label: 'Themes', icon: Palette },
]

const ADMIN_TAB = { id: 'invitations', label: 'HR Requests', icon: UserPlus }

export default function SettingsPanel({ isOpen, initialTab = 'profile', onClose }) {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [wasOpen, setWasOpen] = useState(isOpen)

  // Reset to whichever tab the panel was opened on (gear defaults to
  // "profile"; the avatar dropdown's Profile item does the same) each time
  // it's reopened, rather than remembering the last tab from a prior session.
  // Adjusted during render (React's sanctioned pattern for "reset state when
  // a prop changes") rather than in an effect, so this can't cascade renders.
  if (isOpen && !wasOpen) {
    setWasOpen(true)
    setActiveTab(initialTab)
  } else if (!isOpen && wasOpen) {
    setWasOpen(false)
  }

  useEffect(() => {
    if (!isOpen) return

    document.body.style.overflow = 'hidden'
    function handleEscape(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!user) return null

  const tabs = user.role === 'admin' ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
          />

          {/*
            A plain `fixed` panel centered via `inset-x-auto` + `mx-auto` looks
            centering-shaped but isn't reliable: for a `position: fixed` box,
            leaving both `left` and `right` as `auto` falls back to the
            browser's "static position" algorithm rather than true centering
            — which is what pinned this flush to the left edge. Using a
            full-viewport flex wrapper to center the panel (the same
            technique Modal.jsx already uses) sidesteps that entirely: the
            wrapper is `pointer-events-none` so clicks in the surrounding
            margin fall through to the backdrop's onClose, while the panel
            itself opts back in with `pointer-events-auto`.
          */}
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-8">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              role="dialog"
              aria-modal="true"
              aria-label="Settings"
              className="pointer-events-auto flex h-full w-full max-w-4xl overflow-hidden bg-canvas shadow-2xl sm:h-[min(640px,calc(100vh-4rem))] sm:rounded-xl sm:border sm:border-ink/10"
            >
            <aside className="flex w-44 shrink-0 flex-col border-r border-ink/10 bg-surface-muted p-3 sm:w-56 sm:p-4">
              <p className="px-2 text-xs font-medium uppercase tracking-wide text-ink/50">Settings</p>
              <nav className="mt-4 flex flex-col gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                      activeTab === tab.id ? 'bg-jade-tint text-jade-deep' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="mt-auto pt-4">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    logout()
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-rust hover:bg-rust-tint"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </div>
            </aside>

            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
                <h2 className="font-display text-lg text-ink">{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
                <button type="button" onClick={onClose} className="text-ink/40 hover:text-ink" aria-label="Close settings">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                {activeTab === 'profile' && <AccountPasswordForm />}
                {activeTab === 'themes' && (
                  <>
                    <ThemePicker />
                    <ColorCustomizer />
                  </>
                )}
                {activeTab === 'invitations' && user.role === 'admin' && <HrInvitationsPanel />}
              </div>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
