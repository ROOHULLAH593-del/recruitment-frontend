import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Button from '../components/Button'
import FormField from '../components/FormField'
import api from '../lib/axios'

const ROLE_LABELS = { hr: 'HR', assistant_hr: 'Assistant HR' }

const EMPTY_FORM = { name: '', email: '', password: '', password_confirmation: '' }

// Reached only via a shared invite link (see HrInvitationsPanel), never
// linked from anywhere in the app itself — mirrors RegisterPage's card/
// form styling so it reads as "one of our auth pages", not a bolted-on
// afterthought, despite living entirely outside the normal auth flow (no
// AuthContext involved; this posts straight to the public invitation
// endpoints with no token of its own until an admin approves it).
export default function JoinPage() {
  const { token } = useParams()

  const [status, setStatus] = useState('loading')
  const [roleOffered, setRoleOffered] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // `retryCount` exists purely to give the effect below a dependency the
  // Retry button can bump to re-run the exact same check — the token itself
  // doesn't change between attempts.
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let isCancelled = false
    setStatus('loading')

    api
      .get(`/invitations/${token}`)
      .then(({ data }) => {
        if (isCancelled) return
        setRoleOffered(data.data.role_offered)
        setStatus('valid')
      })
      .catch((error) => {
        if (isCancelled) return
        // A response means the server itself said no (404: expired, used,
        // or never existed) — that's a dead link, nothing to retry. No
        // response at all (offline, DNS, server down, timed out) is a
        // connectivity problem instead, which retrying can plausibly fix.
        setStatus(error.response ? 'invalid' : 'network-error')
      })

    return () => {
      isCancelled = true
    }
  }, [token, retryCount])

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
      await api.post(`/invitations/${token}/apply`, form)
      setStatus('submitted')
    } catch (error) {
      if (error.response?.status === 422) {
        const validationErrors = error.response.data.errors ?? {}
        // A "token" validation error means the invitation stopped being
        // usable between page load and submit (expired or used by someone
        // else in another tab) — that's the same dead-end as never having
        // had a valid token, so show the same error state rather than a
        // form-field message pointing at a field that doesn't exist here.
        if (validationErrors.token) {
          setStatus('invalid')
        } else {
          setErrors(validationErrors)
          setGeneralError(error.response.data.message ?? '')
        }
      } else {
        setGeneralError('Unable to submit your application. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        {status === 'loading' && (
          <div className="rounded-lg border border-ink/10 bg-card-fill p-8 text-center">
            <p className="text-sm text-ink/55">Checking your invitation…</p>
          </div>
        )}

        {status === 'invalid' && (
          <div className="rounded-lg border border-ink/10 bg-card-fill p-8 text-center">
            <h1 className="font-display text-xl text-ink">This invitation isn't available.</h1>
            <p className="mt-2 text-sm text-ink/55">
              The link may have expired, already been used, or doesn't exist. Ask whoever invited you for a new one.
            </p>
          </div>
        )}

        {status === 'network-error' && (
          <div className="rounded-lg border border-ink/10 bg-card-fill p-8 text-center">
            <h1 className="font-display text-xl text-ink">Couldn't connect.</h1>
            <p className="mt-2 text-sm text-ink/55">
              We weren't able to reach the server to check your invitation. Check your connection and try again.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRetryCount((previous) => previous + 1)}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        )}

        {status === 'submitted' && (
          <div className="rounded-lg border border-ink/10 bg-card-fill p-8 text-center">
            <h1 className="font-display text-xl text-ink">Application submitted.</h1>
            <p className="mt-2 text-sm text-ink/55">
              An administrator will review your details shortly. You'll be able to log in once your account is
              approved.
            </p>
          </div>
        )}

        {status === 'valid' && (
          <div className="rounded-lg border border-ink/10 bg-card-fill p-8">
            <h1 className="font-display text-2xl text-ink">
              Join as {ROLE_LABELS[roleOffered] ?? roleOffered}.{' '}
              <span className="text-ink/50">Fill in your details below.</span>
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
                {isSubmitting ? 'Submitting…' : 'Submit application'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
