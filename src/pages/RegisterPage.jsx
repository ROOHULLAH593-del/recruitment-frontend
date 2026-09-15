import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import FormField from '../components/FormField'
import { useAuth } from '../hooks/useAuth'

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    email: '',
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

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors({})
    setGeneralError('')
    setIsSubmitting(true)

    try {
      await register(form)
      navigate('/dashboard', { replace: true })
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
      <div className="w-full max-w-sm rounded-lg border border-ink/10 bg-card-fill p-8">
        <h1 className="font-display text-2xl text-ink">
          Create your account. <span className="text-ink/50">Candidate registration only.</span>
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <FormField
            label="Full name"
            name="name"
            value={form.name}
            onChange={handleChange}
            error={errors.name?.[0]}
            autoComplete="name"
          />
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
