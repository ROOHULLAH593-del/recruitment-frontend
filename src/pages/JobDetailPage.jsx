import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import JobDetailSkeleton from '../components/skeletons/JobDetailSkeleton'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../hooks/useAuth'
import { useThemeColors } from '../hooks/useThemeColors'
import api from '../lib/axios'
import { formatSalaryRange } from '../lib/format'
import { STALE_TIME } from '../lib/queryClient'

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
  const queryClient = useQueryClient()

  const [applyState, setApplyState] = useState('idle')
  const [applyError, setApplyError] = useState('')

  // Real browser-history back (matching how the browser's own Back button
  // behaves) rather than a fresh push to /jobs, so this restores the exact
  // carousel/grid page the candidate was on instead of always resetting to
  // page 1 — the position-restoration system on JobsPage specifically keys
  // that behavior off POP vs PUSH. location.key is 'default' only for the
  // very first entry in this tab's session (react-router's own documented
  // signal for "nothing to go back to" — e.g. a job link opened directly),
  // where navigate(-1) could otherwise leave the app entirely.
  function goBackToJobs() {
    if (location.key === 'default') {
      navigate('/jobs')
    } else {
      navigate(-1)
    }
  }

  const {
    data: job,
    isLoading,
    error: loadErrorObj,
  } = useQuery({
    queryKey: ['jobs', 'detail', id],
    queryFn: () => api.get(`/jobs/${id}`).then((res) => res.data.data),
    staleTime: STALE_TIME.jobPostings,
  })

  const notFound = loadErrorObj?.response?.status === 404
  const loadError = loadErrorObj && !notFound ? 'Unable to load this job posting. Please try again later.' : ''

  async function handleApply() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
      return
    }

    setApplyState('submitting')
    setApplyError('')

    try {
      await api.post(`/jobs/${id}/apply`)
      // The candidate's own applications list (DashboardPage) needs to pick
      // up this new application without waiting out its staleTime.
      queryClient.invalidateQueries({ queryKey: ['applications', 'mine'] })
      setApplyState('success')
    } catch (error) {
      if (error.response?.status === 409) {
        setApplyState('already-applied')
      } else if (error.response?.status === 422 && error.response?.data?.errors?.documents) {
        // The backend's message already names exactly which required
        // documents are missing — shown as-is rather than replaced with a
        // generic failure, with a direct link to go complete them.
        setApplyState('missing-documents')
        setApplyError(error.response.data.errors.documents[0])
      } else {
        setApplyState('error')
        setApplyError(error.response?.data?.message ?? 'Something went wrong. Please try again.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <button type="button" onClick={goBackToJobs} className="text-sm font-medium text-jade hover:text-jade-deep">
          ← Back to all jobs
        </button>

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
                  <button
                    type="button"
                    onClick={goBackToJobs}
                    className="mt-2 inline-block text-sm font-medium text-jade-deep underline hover:text-jade"
                  >
                    Browse more jobs
                  </button>
                </div>
              ) : applyState === 'already-applied' ? (
                <div className="rounded-md bg-ink/5 px-4 py-3">
                  <p className="text-sm font-medium text-ink/70">
                    You've already applied to this job. Please wait for the admin's response.
                  </p>
                  <button
                    type="button"
                    onClick={goBackToJobs}
                    className="mt-2 inline-block text-sm font-medium text-ink underline hover:text-ink/70"
                  >
                    Browse more jobs
                  </button>
                </div>
              ) : applyState === 'missing-documents' ? (
                <div className="rounded-md bg-rust-tint px-4 py-3">
                  <p className="text-sm font-medium text-rust-deep">{applyError}</p>
                  <Link
                    to="/profile"
                    className="mt-2 inline-block text-sm font-medium text-rust-deep underline hover:text-rust"
                  >
                    Complete your profile
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
