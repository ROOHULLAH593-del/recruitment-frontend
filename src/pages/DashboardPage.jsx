import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Pagination from '../components/Pagination'
import ApplicationCardSkeleton from '../components/skeletons/ApplicationCardSkeleton'
import StatusBadge from '../components/StatusBadge'
import { useThemeColors } from '../hooks/useThemeColors'
import api from '../lib/axios'

export default function DashboardPage() {
  const { applicationStatusTheme, scoreChip } = useThemeColors()
  const [applications, setApplications] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCancelled = false
    setIsLoading(true)

    api
      .get('/applications', { params: { page } })
      .then(({ data }) => {
        if (!isCancelled) {
          setApplications(data.data)
          setMeta(data.meta)
        }
      })
      .catch(() => {
        if (!isCancelled) setError('Unable to load your applications. Please try again later.')
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [page])

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-3xl text-ink">My applications</h1>
        <p className="mt-1 text-sm text-ink/50">Track the status of jobs you&apos;ve applied to.</p>

        {error && <p className="mt-8 text-rust">{error}</p>}

        {!isLoading && !error && applications.length === 0 && (
          <p className="mt-8 text-ink/55">
            You haven&apos;t applied to any jobs yet.{' '}
            <Link to="/jobs" className="font-medium text-jade hover:text-jade-deep">
              Browse open positions
            </Link>
            .
          </p>
        )}

        <div className="mt-8 space-y-4">
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => <ApplicationCardSkeleton key={index} />)
            : applications.map((application) => {
                const chip = application.match_score !== null ? scoreChip(Number(application.match_score)) : null

                return (
                  <motion.div
                    key={application.id}
                    whileHover={{ scale: 1.01, y: -2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="rounded-lg border border-card-ring bg-card-fill p-6 hover:shadow-lg hover:shadow-card-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link
                          to={`/jobs/${application.job.id}`}
                          className="text-lg font-semibold text-ink hover:text-jade"
                        >
                          {application.job.title}
                        </Link>
                        <p className="mt-1 text-sm text-ink/55">
                          Applied {new Date(application.applied_at).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status={application.status} theme={applicationStatusTheme} />
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm text-ink/55">
                      Match score:
                      {chip ? (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: chip.bg,
                            color: chip.text,
                            border: chip.border ? `1.5px solid ${chip.border}` : 'none',
                          }}
                        >
                          {Number(application.match_score).toFixed(0)}%
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
        </div>

        <Pagination meta={meta} onPageChange={setPage} />
      </main>
    </div>
  )
}
