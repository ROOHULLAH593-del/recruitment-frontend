import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/axios'
import Button from './Button'
import FormField from './FormField'

const EMPTY_FORM = { current_password: '', password: '', password_confirmation: '' }

// The Settings Panel's "Profile" tab content for every role — basic
// read-only account info plus a password-change form. The full candidate
// profile (skills, education, resume) lives only on the dedicated /profile
// page, not here.
export default function AccountPasswordForm() {
  const { user } = useAuth()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setIsSaved(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors({})
    setGeneralError('')
    setIsSaving(true)

    try {
      await api.put('/user/password', form)
      setForm(EMPTY_FORM)
      setIsSaved(true)
    } catch (error) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors ?? {})
      } else {
        setGeneralError(error.response?.data?.message ?? 'Unable to update your password. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium text-ink/50">Account</p>
        <dl className="mt-2 space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-16 text-ink/55">Name</dt>
            <dd className="font-medium text-ink">{user.name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 text-ink/55">Email</dt>
            <dd className="font-medium text-ink">{user.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 text-ink/55">Role</dt>
            <dd className="font-medium capitalize text-ink">{user.role}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border-t border-ink/10 pt-6">
        <p className="text-xs font-medium text-ink/50">Change password</p>

        <FormField
          label="Current password"
          type="password"
          name="current_password"
          value={form.current_password}
          onChange={handleChange}
          error={errors.current_password?.[0]}
          autoComplete="current-password"
        />
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
          required={false}
          autoComplete="new-password"
        />

        {generalError && <p className="text-sm text-rust">{generalError}</p>}
        {isSaved && <p className="text-sm text-jade-deep">Password updated.</p>}

        <Button type="submit" variant="primary" loading={isSaving}>
          {isSaving ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </div>
  )
}
