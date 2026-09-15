import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import TableCardSkeleton from '../components/skeletons/TableCardSkeleton'
import TableRowSkeleton from '../components/skeletons/TableRowSkeleton'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../hooks/useAuth'
import { useScrollShadow } from '../hooks/useScrollShadow'
import { useThemeColors } from '../hooks/useThemeColors'
import { useToast } from '../hooks/useToast'
import api from '../lib/axios'

const MotionLink = motion.create(Link)
const TAP_SPRING = { type: 'spring', stiffness: 400, damping: 17 }

// First identifying column (Title) and the Actions column stay pinned while
// the data columns between them scroll. See HrInterviewsPage for the fuller
// note on why sticky cells need their own opaque background — `card-fill`
// (not `canvas`) so they stay seamless with the table wrapper's own
// background in themes where the two now differ (e.g. "warm").
const STICKY_LEFT = 'sticky left-0 z-10 bg-card-fill'
const STICKY_RIGHT = 'sticky right-0 z-10 bg-card-fill'
const SHADOW_RIGHT = 'shadow-[6px_0_8px_-6px_rgba(0,0,0,0.12)]'
const SHADOW_LEFT = 'shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.12)]'

export default function HrJobsPage() {
  const { user } = useAuth()
  const { jobStatusTheme, badgeStyle } = useThemeColors()
  // A hardcoded near-black tint reads correctly on every light-canvas theme
  // but is the wrong direction on "dark" (darkening an already near-black
  // row is imperceptible) — `badgeStyle === 'outline'` is currently a
  // reliable proxy for "dark theme is active" without adding a new hook.
  const rowHoverColor = badgeStyle === 'outline' ? 'rgba(240, 242, 245, 0.04)' : 'rgba(22, 24, 29, 0.03)'
  const { showToast } = useToast()
  const scrollRef = useRef(null)
  const { canScrollLeft, canScrollRight } = useScrollShadow(scrollRef)
  const [jobs, setJobs] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [confirmingJob, setConfirmingJob] = useState(null)

  useEffect(() => {
    let isCancelled = false
    setIsLoading(true)

    api
      .get('/jobs', { params: { page } })
      .then(({ data }) => {
        if (!isCancelled) {
          setJobs(data.data)
          setMeta(data.meta)
        }
      })
      .catch(() => {
        if (!isCancelled) setError('Unable to load job postings. Please try again later.')
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [page])

  // assistant_hr is view-only on job postings (no create/edit/delete, see
  // JobPostingPolicy on the backend) but still needs to see the full list to
  // actually be useful for that view-only purpose — filtering it down to
  // "jobs you posted" the way plain "hr" is scoped would show nothing at
  // all, since assistant_hr can never post a job in the first place.
  const canManageJobs = user.role === 'hr' || user.role === 'admin'
  const visibleJobs =
    user.role === 'admin' || user.role === 'assistant_hr'
      ? jobs
      : jobs.filter((job) => job.posted_by?.id === user.id)

  async function confirmDelete(job) {
    setDeletingId(job.id)
    setError('')

    try {
      await api.delete(`/jobs/${job.id}`)
      setJobs((previous) => previous.filter((existing) => existing.id !== job.id))
      showToast(`"${job.title}" was deleted.`, 'positive')
    } catch (error) {
      setError(error.response?.data?.message ?? 'Unable to delete this job posting. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ink">
            Manage jobs.{' '}
            <span className="text-ink/50">
              {user.role === 'hr' ? 'Job postings you created.' : 'All job postings.'}
            </span>
          </h1>
          {canManageJobs && (
            <Link to="/hr/jobs/new">
              <Button variant="primary" icon={Plus}>
                New posting
              </Button>
            </Link>
          )}
        </div>

        {error && <p className="mt-8 text-rust">{error}</p>}

        {!isLoading && visibleJobs.length === 0 && <p className="mt-8 text-ink/55">No job postings yet.</p>}

        {(isLoading || visibleJobs.length > 0) && (
          <div className="mt-8 hidden overflow-x-auto rounded-lg border border-card-ring bg-card-fill md:block" ref={scrollRef}>
            <table className="min-w-full divide-y divide-ink/10">
              <thead>
                <tr className="text-left text-sm text-ink/70">
                  <th className={`px-6 py-3 font-medium ${STICKY_LEFT} ${canScrollRight ? SHADOW_RIGHT : ''}`}>Title</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th
                    className={`px-6 py-3 font-medium ${
                      canManageJobs ? '' : `text-right ${STICKY_RIGHT} ${canScrollLeft ? SHADOW_LEFT : ''}`
                    }`}
                  >
                    Posted by
                  </th>
                  {canManageJobs && (
                    <th className={`px-6 py-3 font-medium text-right ${STICKY_RIGHT} ${canScrollLeft ? SHADOW_LEFT : ''}`}>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5 text-sm">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <TableRowSkeleton key={index} columns={canManageJobs ? 5 : 4} />
                    ))
                  : visibleJobs.map((job) => (
                      <motion.tr
                        key={job.id}
                        whileHover={{ backgroundColor: rowHoverColor }}
                        transition={{ duration: 0.15 }}
                      >
                        <td className={`px-6 py-4 ${STICKY_LEFT} ${canScrollRight ? SHADOW_RIGHT : ''}`}>
                          <Link to={`/jobs/${job.id}`} className="font-medium text-ink hover:text-jade">
                            {job.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={job.status} theme={jobStatusTheme} />
                        </td>
                        <td className="px-6 py-4 text-ink/55">{job.location ?? '—'}</td>
                        <td
                          className={`px-6 py-4 text-ink/55 ${
                            canManageJobs ? '' : `text-right ${STICKY_RIGHT} ${canScrollLeft ? SHADOW_LEFT : ''}`
                          }`}
                        >
                          {job.posted_by?.name ?? '—'}
                        </td>
                        {canManageJobs && (
                          <td className={`px-6 py-4 text-right ${STICKY_RIGHT} ${canScrollLeft ? SHADOW_LEFT : ''}`}>
                            <div className="flex justify-end gap-3">
                              <MotionLink
                                to={`/hr/jobs/${job.id}/edit`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                transition={TAP_SPRING}
                                className="font-medium text-jade hover:text-jade-deep"
                              >
                                Edit
                              </MotionLink>
                              <motion.button
                                type="button"
                                onClick={() => setConfirmingJob(job)}
                                disabled={deletingId === job.id}
                                whileHover={deletingId === job.id ? {} : { scale: 1.05 }}
                                whileTap={deletingId === job.id ? {} : { scale: 0.95 }}
                                transition={TAP_SPRING}
                                className="font-medium text-rust hover:text-rust-deep disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingId === job.id ? 'Deleting…' : 'Delete'}
                              </motion.button>
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}

        {(isLoading || visibleJobs.length > 0) && (
          <div className="mt-8 space-y-3 md:hidden">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => <TableCardSkeleton key={index} />)
              : visibleJobs.map((job) => (
                  <div key={job.id} className="rounded-lg border border-card-ring bg-card-fill p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link to={`/jobs/${job.id}`} className="font-medium text-ink hover:text-jade">
                        {job.title}
                      </Link>
                      <StatusBadge status={job.status} theme={jobStatusTheme} />
                    </div>

                    <dl className="mt-3 space-y-1.5 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink/55">Location</dt>
                        <dd className="text-right text-ink">{job.location ?? '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink/55">Posted by</dt>
                        <dd className="text-right text-ink">{job.posted_by?.name ?? '—'}</dd>
                      </div>
                    </dl>

                    {canManageJobs && (
                      <div className="mt-4 flex items-center gap-4 border-t border-ink/10 pt-3">
                        <MotionLink
                          to={`/hr/jobs/${job.id}/edit`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={TAP_SPRING}
                          className="font-medium text-jade hover:text-jade-deep"
                        >
                          Edit
                        </MotionLink>
                        <motion.button
                          type="button"
                          onClick={() => setConfirmingJob(job)}
                          disabled={deletingId === job.id}
                          whileHover={deletingId === job.id ? {} : { scale: 1.05 }}
                          whileTap={deletingId === job.id ? {} : { scale: 0.95 }}
                          transition={TAP_SPRING}
                          className="font-medium text-rust hover:text-rust-deep disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === job.id ? 'Deleting…' : 'Delete'}
                        </motion.button>
                      </div>
                    )}
                  </div>
                ))}
          </div>
        )}

        <Pagination meta={meta} onPageChange={setPage} />
      </main>

      {confirmingJob && (
        <ConfirmDialog
          title="Delete job posting"
          message={`Delete "${confirmingJob.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => confirmDelete(confirmingJob)}
          onClose={() => setConfirmingJob(null)}
        />
      )}
    </div>
  )
}
