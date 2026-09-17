import { AnimatePresence, motion } from 'framer-motion'
import {
  Briefcase,
  CalendarClock,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Settings,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import AvatarMenu from './AvatarMenu'
import Button from './Button'
import SettingsPanel from './SettingsPanel'

const SPRING = { type: 'spring', stiffness: 380, damping: 30 }
const TAP_SPRING = { type: 'spring', stiffness: 400, damping: 17 }

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `relative inline-flex items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
          isActive ? 'text-jade-deep' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="nav-active-pill"
              className="absolute inset-0 rounded-md bg-jade-tint"
              transition={SPRING}
            />
          )}
          <Icon size={16} className="relative" />
          <span className="relative">{label}</span>
        </>
      )}
    </NavLink>
  )
}

function MobileNavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors ${
          isActive ? 'text-jade-deep' : 'text-ink/70'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="mobile-nav-active-pill"
              className="absolute inset-0 rounded-lg bg-jade-tint"
              transition={SPRING}
            />
          )}
          <Icon size={18} className="relative" />
          <span className="relative">{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function Header() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState(null)

  function openSettings(tab) {
    setIsMenuOpen(false)
    setSettingsTab(tab)
  }

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // SettingsPanel locks scroll for its own isOpen independently — this used
  // to matter here too (openSettings() flips isMenuOpen and settingsTab in
  // the same handler, e.g. tapping "Settings" inside the hamburger menu, and
  // a naive per-component overflow toggle would have one's cleanup clobber
  // the other's lock). useBodyScrollLock's shared reference count makes that
  // coordination unnecessary: each caller just reports its own need.
  useBodyScrollLock(isMenuOpen)

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  const candidateLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/jobs', icon: Briefcase, label: 'Jobs' },
    { to: '/profile', icon: User, label: 'Profile' },
  ]
  const hrLinks = [
    { to: '/hr/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/hr/jobs', icon: Briefcase, label: 'Manage Jobs' },
    { to: '/hr/applications', icon: Users, label: 'Applications' },
    { to: '/hr/interviews', icon: CalendarClock, label: 'Interviews' },
  ]
  const activeLinks = isAuthenticated ? (user.role === 'candidate' ? candidateLinks : hrLinks) : []
  const logoDestination = isAuthenticated && user ? (user.role === 'candidate' ? '/jobs' : '/hr/dashboard') : '/'

  function closeMenu() {
    setIsMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-40">
      <div className={`transition-[padding] duration-300 ${isScrolled ? 'px-3 pt-3 sm:px-4' : ''}`}>
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between gap-4 transition-all duration-300 ${
            isScrolled
              ? 'rounded-full border border-ink/10 bg-canvas px-4 py-2 shadow-lg shadow-ink/5 backdrop-blur-xl'
              : 'border-b border-ink/10 bg-canvas px-6 py-4'
          }`}
        >
          <Link to={logoDestination} className="shrink-0 whitespace-nowrap font-display text-xl text-ink" onClick={closeMenu}>
            Job Board
          </Link>

          {!isLoading && (
            <>
              <nav className="hidden items-center gap-1 md:flex">
                {activeLinks.map((link) => (
                  <NavItem key={link.to} {...link} />
                ))}
              </nav>

              <div className="hidden items-center gap-4 md:flex">
                {isAuthenticated ? (
                  <>
                    <motion.button
                      type="button"
                      onClick={() => openSettings('profile')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-ink/60 hover:bg-ink/5 hover:text-ink"
                      aria-label="Open settings"
                    >
                      <Settings size={18} />
                    </motion.button>
                    <AvatarMenu onOpenProfile={() => openSettings('profile')} />
                  </>
                ) : (
                  <>
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={TAP_SPRING}>
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
                      >
                        <LogIn size={16} />
                        Log in
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={TAP_SPRING}>
                      <Link
                        to="/register"
                        className="inline-flex items-center gap-2 rounded-md bg-jade px-4 py-2 text-sm font-medium text-[var(--color-on-jade,_white)] hover:bg-jade-deep hover:shadow-[var(--shadow-glow)]"
                      >
                        <UserPlus size={16} />
                        Register
                      </Link>
                    </motion.div>
                  </>
                )}
              </div>

              <motion.button
                onClick={() => setIsMenuOpen((open) => !open)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink/15 text-ink md:hidden"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </motion.button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={closeMenu}
              className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px] md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.35, ease: 'easeInOut' }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-canvas shadow-2xl md:hidden"
            >
              <div className="flex h-full flex-col px-6 py-6">
                <div className="flex items-center justify-between">
                  <Link to={logoDestination} onClick={closeMenu} className="font-display text-lg text-ink">
                    Job Board
                  </Link>
                  <motion.button
                    onClick={closeMenu}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15 text-ink"
                    aria-label="Close menu"
                  >
                    <X size={18} />
                  </motion.button>
                </div>

                <nav className="mt-8 flex flex-col gap-1">
                  {activeLinks.map((link, index) => (
                    <motion.div
                      key={link.to}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + index * 0.06, duration: 0.3, ease: 'easeOut' }}
                    >
                      <MobileNavItem {...link} onClick={closeMenu} />
                    </motion.div>
                  ))}
                </nav>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3, ease: 'easeOut' }}
                  className="mt-auto flex flex-col gap-3 border-t border-ink/10 pt-6"
                >
                  {isAuthenticated ? (
                    <>
                      <p className="text-sm font-medium text-ink">
                        {user.name} ({user.role})
                      </p>
                      <Button variant="secondary" icon={Settings} onClick={() => openSettings('profile')}>
                        Settings
                      </Button>
                      <Button
                        variant="secondary"
                        icon={LogOut}
                        onClick={() => {
                          logout()
                          closeMenu()
                        }}
                      >
                        Log out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={closeMenu}>
                        <Button variant="secondary" icon={LogIn} className="w-full">
                          Log in
                        </Button>
                      </Link>
                      <Link to="/register" onClick={closeMenu}>
                        <Button variant="primary" icon={UserPlus} className="w-full">
                          Register
                        </Button>
                      </Link>
                    </>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SettingsPanel isOpen={settingsTab !== null} initialTab={settingsTab ?? 'profile'} onClose={() => setSettingsTab(null)} />
    </header>
  )
}
