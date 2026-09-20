import { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import FormField from '../components/FormField'
import api from '../lib/axios'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const { data } = await api.post('/forgot-password', { email })
      // Shown exactly as the backend returns it — deliberately the same
      // whether or not the email matched an account, so the UI can't leak
      // that distinction either.
      setMessage(data.message)
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? 'Unable to send the reset link. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-lg border border-ink/10 bg-card-fill p-8">
        <h1 className="font-display text-2xl text-ink">
          Forgot password? <span className="text-ink/50">We&apos;ll email you a reset link.</span>
        </h1>

        {message ? (
          <div className="mt-6 rounded-md bg-jade-tint px-4 py-3">
            <p className="text-sm font-medium text-jade-deep">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <FormField
              label="Email"
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />

            {error && <p className="text-sm text-rust">{error}</p>}

            <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
              {isSubmitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ink/55">
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-jade hover:text-jade-deep">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
