import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

// Reformats a CNIC's raw digits into the standard XXXXX-XXXXXXX-X grouping
// as the candidate types, so they never have to type the dashes themselves.
function formatCnic(digits) {
  const truncated = digits.slice(0, 13)
  let formatted = truncated.slice(0, 5)
  if (truncated.length > 5) formatted += `-${truncated.slice(5, 12)}`
  if (truncated.length > 12) formatted += `-${truncated.slice(12, 13)}`
  return formatted
}

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    cnic: '',
    password: '',
    password_confirmation: '',
  })
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  function handleCnicChange(event) {
    const previousFormatted = form.cnic
    const nextRaw = event.target.value
    let digits = nextRaw.replace(/\D/g, '')

    // Backspacing right after an auto-inserted dash only removes the dash
    // itself (it isn't a digit) — without this, the re-formatted value
    // comes out identical to before and backspace appears to do nothing.
    if (nextRaw.length === previousFormatted.length - 1 && previousFormatted[nextRaw.length] === '-') {
      digits = digits.slice(0, -1)
    }

    setForm((previous) => ({ ...previous, cnic: formatCnic(digits) }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors({})
    setGeneralError('')
    setIsSubmitting(true)

    try {
      await register(form)
      showToast('Account created — please log in.', 'positive')
      navigate('/login', { replace: true })
    } catch (error) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors ?? {})
      } else {
        setGeneralError(error.response?.data?.message ?? 'Unable to register. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-lg border border-ink/10 bg-card-fill p-8 md:max-w-2xl">
        <h1 className="font-display text-2xl text-ink">
          Create your account. <span className="text-ink/50">Candidate registration only.</span>
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="Full name"
              name="name"
              value={form.name}
              onChange={handleChange}
              error={errors.name?.[0]}
              autoComplete="name"
            />
            <FormField
              label="Username"
              name="username"
              value={form.username}
              onChange={handleChange}
              error={errors.username?.[0]}
              autoComplete="username"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="Email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email?.[0]}
              autoComplete="email"
            />
            <FormField
              label="CNIC"
              name="cnic"
              value={form.cnic}
              onChange={handleCnicChange}
              error={errors.cnic?.[0]}
              autoComplete="off"
              inputMode="numeric"
              placeholder="12345-1234567-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="Password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              error={errors.password?.[0]}
              autoComplete="new-password"
            />
            <FormField
              label="Confirm password"
              type="password"
              name="password_confirmation"
              value={form.password_confirmation}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          {generalError && <p className="text-sm text-rust">{generalError}</p>}

          <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/55">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-jade hover:text-jade-deep">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
