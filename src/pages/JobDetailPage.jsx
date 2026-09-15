import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import JobDetailSkeleton from '../components/skeletons/JobDetailSkeleton'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../hooks/useAuth'
import { useThemeColors } from '../hooks/useThemeColors'
import api from '../lib/axios'
import { formatSalaryRange } from '../lib/format'

const EDUCATION_LABELS = {
  highschool: 'High School',
  bachelors: "Bachelor's degree",
  masters: "Master's degree",
  phd: 'PhD',
}

export default function JobDetailPage() {
  const { id } = useParams()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { jobStatusTheme } = useThemeColors()
  const navigate = useNavigate()
  const location = useLocation()

  const [job, setJob] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [applyState, setApplyState] = useState('idle')
  const [applyError, setApplyError] = useState('')

  useEffect(() => {
    let isCancelled = false

    api
      .get(`/jobs/${id}`)
      .then(({ data }) => {
        if (!isCancelled) setJob(data.data)
      })
      .catch((error) => {
        if (isCancelled) return
        if (error.response?.status === 404) {
          setNotFound(true)
        } else {
          setLoadError('Unable to load this job posting. Please try again later.')
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [id])

  async function handleApply() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
      return
    }

    setApplyState('submitting')
    setApplyError('')

    try {
      await api.post(`/jobs/${id}/apply`)
      setApplyState('success')
    } catch (error) {
      if (error.response?.status === 409) {
        setApplyState('already-applied')
      } else {
        setApplyState('error')
        setApplyError(error.response?.data?.message ?? 'Something went wrong. Please try again.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link to="/jobs" className="text-sm font-medium text-jade hover:text-jade-deep">
          ← Back to all jobs
        </Link>

        {isLoading && (
          <div className="mt-6">
            <JobDetailSkeleton />
          </div>
        )}

        {notFound && (
          <div className="mt-6 rounded-lg border border-card-ring bg-card-fill p-8 text-center">
            <h1 className="font-display text-xl text-ink">Job not found</h1>
            <p className="mt-2 text-ink/55">This posting may have been removed or is no longer available.</p>
          </div>
        )}

        {loadError && <p className="mt-6 text-rust">{loadError}</p>}

        {job && (
          <div className="mt-6 rounded-lg border border-card-ring bg-card-fill p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl text-ink">{job.title}</h1>
                {job.department && <p className="mt-1 text-ink/55">{job.department}</p>}
              </div>
              <StatusBadge status={job.status} theme={jobStatusTheme} />
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink/55">Location</dt>
                <dd className="mt-1 text-ink">{job.location ?? 'Remote / Unspecified'}</dd>
              </div>
              <div>
                <dt className="text-ink/55">Salary</dt>
                <dd className="mt-1 text-ink">{formatSalaryRange(job.salary_min, job.salary_max) ?? 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-ink/55">Experience required</dt>
                <dd className="mt-1 text-ink">
                  {job.min_experience > 0 ? `${job.min_experience}+ years` : 'No experience required'}
                </dd>
              </div>
              <div>
                <dt className="text-ink/55">Education</dt>
                <dd className="mt-1 text-ink">{EDUCATION_LABELS[job.education_requirement] ?? 'Not specified'}</dd>
              </div>
            </dl>

            {job.required_skills?.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-ink/55">Skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.required_skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-violet-tint px-3 py-1 text-xs font-medium text-violet-deep"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <p className="text-sm text-ink/55">Description</p>
              <p className="mt-2 whitespace-pre-line text-ink/80">{job.description}</p>
            </div>

            <div className="mt-8 border-t border-ink/10 pt-6">
              {job.status !== 'open' ? (
                <p className="text-sm text-ink/55">This position is not currently accepting applications.</p>
              ) : authLoading ? null : isAuthenticated && user.role !== 'candidate' ? (
                <p className="text-sm text-ink/55">Only candidate accounts can apply to jobs.</p>
              ) : applyState === 'success' ? (
                <div className="rounded-md bg-jade-tint px-4 py-3">
                  <p className="text-sm font-medium text-jade-deep">Application submitted! We'll be in touch.</p>
                  <Link to="/jobs" className="mt-2 inline-block text-sm font-medium text-jade-deep underline hover:text-jade">
                    Browse more jobs
                  </Link>
                </div>
              ) : applyState === 'already-applied' ? (
                <div className="rounded-md bg-ink/5 px-4 py-3">
                  <p className="text-sm font-medium text-ink/70">
                    You've already applied to this job. Please wait for the admin's response.
                  </p>
                  <Link to="/jobs" className="mt-2 inline-block text-sm font-medium text-ink underline hover:text-ink/70">
                    Browse more jobs
                  </Link>
                </div>
              ) : (
                <div>
                  <Button variant="primary" onClick={handleApply} loading={applyState === 'submitting'}>
                    {applyState === 'submitting' ? 'Applying…' : 'Apply'}
                  </Button>
                  {applyState === 'error' && <p className="mt-2 text-sm text-rust">{applyError}</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
