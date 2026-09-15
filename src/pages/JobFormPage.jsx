import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import FormField from '../components/FormField'
import Select from '../components/Select'
import FormSkeleton from '../components/skeletons/FormSkeleton'
import api from '../lib/axios'

const EDUCATION_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'highschool', label: 'High School' },
  { value: 'bachelors', label: "Bachelor's degree" },
  { value: 'masters', label: "Master's degree" },
  { value: 'phd', label: 'PhD' },
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
]

const EMPTY_FORM = {
  title: '',
  description: '',
  department: '',
  required_skills: '',
  min_experience: '',
  education_requirement: '',
  salary_min: '',
  salary_max: '',
  location: '',
  status: 'draft',
}

const SELECT_CLASSES =
  'mt-1 block w-full rounded-md border border-ink/15 bg-card-fill px-3 py-2 text-ink focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade'

export default function JobFormPage() {
  const { id } = useParams()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isEditMode) return

    let isCancelled = false

    api
      .get(`/jobs/${id}`)
      .then(({ data }) => {
        if (isCancelled) return
        const job = data.data
        setForm({
          title: job.title ?? '',
          description: job.description ?? '',
          department: job.department ?? '',
          required_skills: (job.required_skills ?? []).join(', '),
          min_experience: job.min_experience ?? 0,
          education_requirement: job.education_requirement ?? '',
          salary_min: job.salary_min ?? '',
          salary_max: job.salary_max ?? '',
          location: job.location ?? '',
          status: job.status ?? 'draft',
        })
      })
      .catch(() => {
        if (!isCancelled) setLoadError('Unable to load this job posting. Please try again later.')
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [id, isEditMode])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors({})
    setGeneralError('')
    setIsSubmitting(true)

    const payload = {
      title: form.title,
      description: form.description,
      department: form.department || null,
      required_skills: form.required_skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
      min_experience: form.min_experience === '' ? 0 : Number(form.min_experience),
      education_requirement: form.education_requirement || null,
      salary_min: form.salary_min === '' ? null : Number(form.salary_min),
      salary_max: form.salary_max === '' ? null : Number(form.salary_max),
      location: form.location || null,
      status: form.status,
    }

    try {
      if (isEditMode) {
        await api.put(`/jobs/${id}`, payload)
      } else {
        await api.post('/jobs', payload)
      }
      navigate('/hr/jobs')
    } catch (error) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors ?? {})
      } else {
        setGeneralError(error.response?.data?.message ?? 'Unable to save this job posting. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-display text-3xl text-ink">{isEditMode ? 'Edit job posting' : 'Create job posting'}</h1>

        {isLoading && (
          <div className="mt-8">
            <FormSkeleton fields={8} />
          </div>
        )}
        {loadError && <p className="mt-8 text-rust">{loadError}</p>}

        {!isLoading && !loadError && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-lg border border-ink/10 bg-card-fill p-8">
            <FormField label="Title" name="title" value={form.title} onChange={handleChange} error={errors.title?.[0]} />

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-ink">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={6}
                value={form.description}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-ink/15 bg-card-fill px-3 py-2 text-ink focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade"
              />
              {errors.description && <p className="mt-1 text-sm text-rust">{errors.description[0]}</p>}
            </div>

            <FormField
              label="Department"
              name="department"
              value={form.department}
              onChange={handleChange}
              error={errors.department?.[0]}
              required={false}
            />
            <FormField
              label="Location"
              name="location"
              value={form.location}
              onChange={handleChange}
              error={errors.location?.[0]}
              required={false}
            />

            <div>
              <FormField
                label="Required skills"
                name="required_skills"
                value={form.required_skills}
                onChange={handleChange}
                error={errors.required_skills?.[0]}
                required={false}
              />
              <p className="mt-1 text-xs text-ink/55">Separate skills with commas.</p>
            </div>

            <FormField
              label="Minimum experience (years)"
              type="number"
              name="min_experience"
              value={form.min_experience}
              onChange={handleChange}
              error={errors.min_experience?.[0]}
              required={false}
            />

            <div>
              <label htmlFor="education_requirement" className="block text-sm font-medium text-ink">
                Education requirement
              </label>
              <Select
                id="education_requirement"
                name="education_requirement"
                value={form.education_requirement}
                onChange={handleChange}
                className={SELECT_CLASSES}
                options={EDUCATION_OPTIONS}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Salary min (PKR)"
                type="number"
                name="salary_min"
                value={form.salary_min}
                onChange={handleChange}
                error={errors.salary_min?.[0]}
                required={false}
              />
              <FormField
                label="Salary max (PKR)"
                type="number"
                name="salary_max"
                value={form.salary_max}
                onChange={handleChange}
                error={errors.salary_max?.[0]}
                required={false}
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-ink">
                Status
              </label>
              <Select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className={SELECT_CLASSES}
                options={STATUS_OPTIONS}
              />
              {errors.status && <p className="mt-1 text-sm text-rust">{errors.status[0]}</p>}
            </div>

            {generalError && <p className="text-sm text-rust">{generalError}</p>}

            <div className="flex items-center gap-3">
              <Button type="submit" variant="primary" loading={isSubmitting}>
                {isSubmitting ? 'Saving…' : isEditMode ? 'Save changes' : 'Create posting'}
              </Button>
              <Link to="/hr/jobs" className="text-sm font-medium text-ink/55 hover:text-ink">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
