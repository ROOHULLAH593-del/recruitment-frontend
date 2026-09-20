import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useToast } from '../hooks/useToast'
import api from '../lib/axios'

// The page the real password-reset email already links to
// ({FRONTEND_URL}/reset-password?token=...&email=...) — see the backend's
// AppServiceProvider::boot() override of ResetPassword::createUrlUsing().
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [form, setForm] = useState({ password: '', password_confirmation: '' })
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      await api.post('/reset-password', { token, email, ...form })
      showToast('Password reset — please log in.', 'positive')
      navigate('/login', { replace: true })
    } catch (error) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors ?? {})
      } else {
        setGeneralError(error.response?.data?.message ?? 'Unable to reset your password. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // An invalid/expired token comes back as a 422 on `email` (that's the
  // field Laravel's password broker reports its own status against) —
  // shown as its own clear state rather than an inline field error, since
  // there's no form left worth filling in at that point.
  const invalidTokenError = errors.email?.[0]

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-lg border border-ink/10 bg-card-fill p-8">
        <h1 className="font-display text-2xl text-ink">
          Reset password. <span className="text-ink/50">Choose a new password below.</span>
        </h1>

        {(!token || !email) && (
          <div className="mt-6 rounded-md bg-rust-tint px-4 py-3">
            <p className="text-sm font-medium text-rust-deep">
              This reset link is missing some information. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="mt-2 inline-block text-sm font-medium text-rust-deep underline hover:text-rust"
            >
              Request a new link
            </Link>
          </div>
        )}

        {token && email && invalidTokenError && (
          <div className="mt-6 rounded-md bg-rust-tint px-4 py-3">
            <p className="text-sm font-medium text-rust-deep">{invalidTokenError}</p>
            <Link
              to="/forgot-password"
              className="mt-2 inline-block text-sm font-medium text-rust-deep underline hover:text-rust"
            >
              Request a new link
            </Link>
          </div>
        )}

        {token && email && !invalidTokenError && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <FormField
              label="New password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              error={errors.password?.[0]}
              autoComplete="new-password"
            />
            <FormField
              label="Confirm new password"
              type="password"
              name="password_confirmation"
              value={form.password_confirmation}
              onChange={handleChange}
              autoComplete="new-password"
            />

            {generalError && <p className="text-sm text-rust">{generalError}</p>}

            <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
              {isSubmitting ? 'Resetting…' : 'Reset password'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ink/55">
          <Link to="/login" className="font-medium text-jade hover:text-jade-deep">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  )
}
