import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useToast } from '../hooks/useToast'
import api from '../lib/axios'
import { STALE_TIME } from '../lib/queryClient'
import Button from './Button'
import FormField from './FormField'
import Select from './Select'
import FormSkeleton from './skeletons/FormSkeleton'

const RESUME_MAX_BYTES = 5 * 1024 * 1024

const EDUCATION_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'highschool', label: 'High School' },
  { value: 'bachelors', label: "Bachelor's degree" },
  { value: 'masters', label: "Master's degree" },
  { value: 'phd', label: 'PhD' },
]

const SELECT_CLASSES =
  'mt-1 block w-full rounded-md border border-ink/15 bg-card-fill px-3 py-2 text-ink focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade'

function mapProfileToForm(profile) {
  return {
    skills: (profile.skills ?? []).join(', '),
    education_level: profile.education_level ?? '',
    years_experience: profile.years_experience ?? 0,
    resume_text: profile.resume_text ?? '',
  }
}

// The candidate profile-editing form (skills, education, experience, resume).
// Shared as-is between the standalone /profile page and the settings panel's
// Profile tab — same component, same logic, no duplication.
export default function ProfileForm() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/profile').then((res) => res.data),
    staleTime: STALE_TIME.profile,
  })

  if (isLoading) {
    return <FormSkeleton fields={4} />
  }

  if (error) {
    return <p className="text-rust">Unable to load your profile. Please try again later.</p>
  }

  return <ProfileFormFields profile={data.data} />
}

// Split out so the form's local editable state initializes exactly once,
// from whatever `profile` was at the moment this mounts (instantly from
// cache, or after the first load resolves) — this component only mounts once
// the parent's query has real data, so there's no race to guard against, and
// a later background refetch updates `profile` without remounting this or
// touching the form fields the candidate may be mid-editing.
function ProfileFormFields({ profile }) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const [form, setForm] = useState(() => mapProfileToForm(profile))
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isUploadingResume, setIsUploadingResume] = useState(false)
  const [uploadError, setUploadError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setIsSaved(false)
  }

  async function handleResumeFileChange(event) {
    const file = event.target.files?.[0]
    // Reset now, not after the request, so picking the same file again still fires this handler.
    event.target.value = ''
    if (!file) return

    setUploadError('')

    if (file.type !== 'application/pdf') {
      setUploadError('Please upload a PDF file.')
      return
    }
    if (file.size > RESUME_MAX_BYTES) {
      setUploadError('That file is too large — please upload a PDF under 5MB.')
      return
    }

    setIsUploadingResume(true)

    const body = new FormData()
    body.append('resume', file)

    try {
      const { data } = await api.post('/profile/resume-upload', body)
      const suggested = data.data

      // Pre-fill only — nothing is saved until the candidate submits the
      // form below themselves. education_level is left alone when Gemini
      // couldn't determine one, rather than blanking out an existing choice.
      setForm((previous) => ({
        skills: suggested.skills.join(', '),
        education_level: suggested.education_level ?? previous.education_level,
        years_experience: suggested.years_experience,
        resume_text: suggested.resume_text,
      }))
      setIsSaved(false)
      showToast('Resume parsed — review the pre-filled fields below, then save.', 'positive')
    } catch (error) {
      setUploadError(error.response?.data?.message ?? "Couldn't auto-fill — please enter your details manually.")
    } finally {
      setIsUploadingResume(false)
    }
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

      const savedProfile = data.data
      // Keep the cache in sync with what was just saved so a revisit within
      // staleTime shows this save, not the pre-save data from before it.
      queryClient.setQueryData(['profile'], { data: savedProfile })
      setForm(mapProfileToForm(savedProfile))
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

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-ink/20 bg-canvas/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">Upload Resume (PDF)</p>
            <p className="mt-0.5 text-xs text-ink/55">
              We'll pre-fill the fields below for you to review before saving — nothing is saved automatically.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            icon={Upload}
            loading={isUploadingResume}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploadingResume ? 'Reading…' : 'Upload'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleResumeFileChange}
            className="hidden"
          />
        </div>
        {uploadError && <p className="mt-3 text-sm text-rust">{uploadError}</p>}
      </div>

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
    </div>
  )
}
