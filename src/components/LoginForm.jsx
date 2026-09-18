import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Button from './Button'
import FormField from './FormField'

// How long the cross-portal clarity banner stays up before the (already
// queued) redirect is allowed to proceed. Purely informational — no account
// is blocked either way — so this just needs to be long enough to read a
// short sentence, not a click-to-dismiss delay.
const MISMATCH_DISPLAY_MS = 1800

const MISMATCH_MESSAGES = {
  // portal="staff" but the account is a candidate
  staff: "You're signed in with a candidate account — taking you to your dashboard.",
  // portal="candidate" but the account is hr/admin
  candidate: "You're signed in with a staff account — taking you to your dashboard.",
}

// Shared by the candidate-facing /login and the staff-facing /staff pages —
// same form logic, same backend endpoint, same role-based post-login
// redirect, just different copy/framing per page (and /staff omits the
// "Register" link, since staff accounts aren't self-registered). `portal`
// tells this component which audience the page it's rendered on is framed
// for, so it can detect a candidate-on-/staff or staff-on-/login mismatch
// and show a brief clarifying note before the normal redirect proceeds.
export default function LoginForm({ title, subtitle, submitLabel = 'Log in', showRegisterLink = true, portal }) {
  const { login, isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  const [form, setForm] = useState({ identifier: '', password: '' })
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mismatchNotice, setMismatchNotice] = useState(null)

  // Holding the redirect behind `!mismatchNotice` is what gives the banner
  // its brief on-screen window: `isAuthenticated` flips true the instant
  // login() resolves, but this render still shows the banner instead of
  // navigating until the timer below clears it.
  if (!isLoading && isAuthenticated && !mismatchNotice) {
    const defaultDestination = user?.role === 'candidate' ? '/dashboard' : '/hr/dashboard'
    return <Navigate to={location.state?.from?.pathname ?? defaultDestination} replace />
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors({})
    setGeneralError('')
    setIsSubmitting(true)

    try {
      const loggedInUser = await login(form.identifier, form.password)

      const candidateOnStaffPortal = portal === 'staff' && loggedInUser.role === 'candidate'
      const staffOnCandidatePortal = portal === 'candidate' && loggedInUser.role !== 'candidate'

      if (candidateOnStaffPortal || staffOnCandidatePortal) {
        setMismatchNotice(candidateOnStaffPortal ? MISMATCH_MESSAGES.staff : MISMATCH_MESSAGES.candidate)
        setTimeout(() => setMismatchNotice(null), MISMATCH_DISPLAY_MS)
      }
    } catch (error) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors ?? {})
      } else {
        setGeneralError(error.response?.data?.message ?? 'Unable to log in. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <AnimatePresence>
        {mismatchNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            role="status"
            className="mb-4 rounded-lg border border-ink/10 bg-surface-muted px-4 py-3 text-sm text-ink/70"
          >
            {mismatchNotice}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-lg border border-ink/10 bg-card-fill p-8">
        <h1 className="font-display text-2xl text-ink">
          {title} <span className="text-ink/50">{subtitle}</span>
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <FormField
            label="Email, Username, or CNIC"
            name="identifier"
            value={form.identifier}
            onChange={handleChange}
            error={errors.identifier?.[0]}
            autoComplete="username"
          />
          <FormField
            label="Password"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            error={errors.password?.[0]}
            autoComplete="current-password"
          />

          {generalError && <p className="text-sm text-rust">{generalError}</p>}

          <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Logging in…' : submitLabel}
          </Button>
        </form>

        {showRegisterLink && (
          <p className="mt-6 text-center text-sm text-ink/55">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-jade hover:text-jade-deep">
              Register
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
