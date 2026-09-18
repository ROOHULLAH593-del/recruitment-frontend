import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CalendarClock, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Pagination from '../components/Pagination'
import ScoreChip, { AiSemanticMatchChip } from '../components/ScoreChip'
import ApplicationCardSkeleton from '../components/skeletons/ApplicationCardSkeleton'
import StatusBadge from '../components/StatusBadge'
import { useThemeColors } from '../hooks/useThemeColors'
import api from '../lib/axios'
import { STALE_TIME } from '../lib/queryClient'

export default function DashboardPage() {
  const { applicationStatusTheme } = useThemeColors()
  const [page, setPage] = useState(1)

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['applications', 'mine', page],
    queryFn: () => api.get('/applications', { params: { page } }).then((res) => res.data),
    staleTime: STALE_TIME.applications,
    // Keeps the current page's rows on screen while a new page loads
    // instead of dropping to skeletons on every page change — the same
    // "don't flash a loading state over content the user can already see"
    // principle this whole migration is about, just applied within a page
    // of results too, not only between visits.
    placeholderData: keepPreviousData,
  })

  const applications = data?.data ?? []
  const meta = data?.meta ?? null

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-3xl text-ink">My applications</h1>
        <p className="mt-1 text-sm text-ink/50">Track the status of jobs you&apos;ve applied to.</p>

        {isError && <p className="mt-8 text-rust">Unable to load your applications. Please try again later.</p>}

        {!isLoading && !isError && applications.length === 0 && (
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
                        {application.interview && (
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/55">
                            <CalendarClock size={14} />
                            Interview: {new Date(application.interview.scheduled_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={application.status} theme={applicationStatusTheme} />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink/55">
                      <div className="flex items-center gap-2">
                        Match score:
                        <ScoreChip score={application.match_score} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Sparkles size={13} className="text-violet-deep" />
                        AI Semantic Match:
                        <AiSemanticMatchChip score={application.semantic_match_score} />
                      </div>
                    </div>

                    {application.status === 'rejected' && application.rejection_reason && (
                      <div className="mt-4 rounded-md bg-rust-tint px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-rust-deep">Feedback</p>
                        <p className="mt-1 text-sm text-rust-deep">{application.rejection_reason}</p>
                      </div>
                    )}
                  </motion.div>
                )
              })}
        </div>

        <Pagination meta={meta} onPageChange={setPage} />
      </main>
    </div>
  )
}
