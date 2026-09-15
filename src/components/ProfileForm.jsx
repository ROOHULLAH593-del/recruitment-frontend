import { useEffect, useState } from 'react'
import api from '../lib/axios'
import Button from './Button'
import FormField from './FormField'
import Select from './Select'
import FormSkeleton from './skeletons/FormSkeleton'

const EDUCATION_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'highschool', label: 'High School' },
  { value: 'bachelors', label: "Bachelor's degree" },
  { value: 'masters', label: "Master's degree" },
  { value: 'phd', label: 'PhD' },
]

const SELECT_CLASSES =
  'mt-1 block w-full rounded-md border border-ink/15 bg-card-fill px-3 py-2 text-ink focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade'

// The candidate profile-editing form (skills, education, experience, resume).
// Shared as-is between the standalone /profile page and the settings panel's
// Profile tab — same component, same logic, no duplication.
export default function ProfileForm() {
  const [form, setForm] = useState({
    skills: '',
    education_level: '',
    years_experience: '',
    resume_text: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    let isCancelled = false

    api
      .get('/profile')
      .then(({ data }) => {
        if (isCancelled) return
        const profile = data.data
        setForm({
          skills: (profile.skills ?? []).join(', '),
          education_level: profile.education_level ?? '',
          years_experience: profile.years_experience ?? 0,
          resume_text: profile.resume_text ?? '',
        })
      })
      .catch(() => {
        if (!isCancelled) setLoadError('Unable to load your profile. Please try again later.')
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [])

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

    const skills = form.skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean)

    try {
      const { data } = await api.put('/profile', {
        skills,
        education_level: form.education_level || null,
        years_experience: form.years_experience === '' ? 0 : Number(form.years_experience),
        resume_text: form.resume_text,
      })

      const profile = data.data
      setForm({
        skills: (profile.skills ?? []).join(', '),
        education_level: profile.education_level ?? '',
        years_experience: profile.years_experience ?? 0,
        resume_text: profile.resume_text ?? '',
      })
      setIsSaved(true)
    } catch (error) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors ?? {})
      } else {
        setGeneralError(error.response?.data?.message ?? 'Unable to save your profile. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <FormSkeleton fields={4} />
  }

  if (loadError) {
    return <p className="text-rust">{loadError}</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <FormField
          label="Skills"
          name="skills"
          value={form.skills}
          onChange={handleChange}
          error={errors.skills?.[0]}
          required={false}
        />
        <p className="mt-1 text-xs text-ink/55">Separate skills with commas.</p>
      </div>

      <div>
        <label htmlFor="education_level" className="block text-sm font-medium text-ink">
          Education level
        </label>
        <Select
          id="education_level"
          name="education_level"
          value={form.education_level}
          onChange={handleChange}
          className={SELECT_CLASSES}
          options={EDUCATION_OPTIONS}
        />
        {errors.education_level && <p className="mt-1 text-sm text-rust">{errors.education_level[0]}</p>}
      </div>

      <FormField
        label="Years of experience"
        type="number"
        name="years_experience"
        value={form.years_experience}
        onChange={handleChange}
        error={errors.years_experience?.[0]}
        required={false}
      />

      <div>
        <label htmlFor="resume_text" className="block text-sm font-medium text-ink">
          Resume
        </label>
        <textarea
          id="resume_text"
          name="resume_text"
          rows={8}
          value={form.resume_text}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-ink/15 bg-card-fill px-3 py-2 text-ink focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade"
        />
        {errors.resume_text && <p className="mt-1 text-sm text-rust">{errors.resume_text[0]}</p>}
      </div>

      {generalError && <p className="text-sm text-rust">{generalError}</p>}
      {isSaved && <p className="text-sm text-jade-deep">Profile saved.</p>}

      <Button type="submit" variant="primary" loading={isSaving}>
        {isSaving ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  )
}
