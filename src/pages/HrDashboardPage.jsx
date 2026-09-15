import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import SkeletonBlock from '../components/skeletons/SkeletonBlock'
import StatCardSkeleton from '../components/skeletons/StatCardSkeleton'
import StatusBadge from '../components/StatusBadge'
import { useThemeColors } from '../hooks/useThemeColors'
import api from '../lib/axios'
import { APPLICATION_STATUS_ORDER } from '../lib/applicationStatus'

export default function HrDashboardPage() {
  const { applicationStatusTheme } = useThemeColors()
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCancelled = false

    api
      .get('/dashboard/stats')
      .then(({ data }) => {
        if (!isCancelled) setStats(data)
      })
      .catch(() => {
        if (!isCancelled) setError('Unable to load dashboard stats. Please try again later.')
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-display text-3xl text-ink">
          HR dashboard. <span className="text-ink/50">An overview of hiring activity across the organization.</span>
        </h1>

        {error && <p className="mt-8 text-rust">{error}</p>}

        {isLoading && (
          <>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
            <div className="mt-8 rounded-lg border border-ink/10 bg-card-fill p-6">
              <SkeletonBlock className="h-5 w-40" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <SkeletonBlock className="h-6 w-28 rounded-full" />
                    <SkeletonBlock className="h-4 w-6" />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {stats && (
          <>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Open jobs" value={stats.total_open_jobs} delay={0} />
              <StatCard label="Applications this week" value={stats.applications_this_week} delay={0.12} />
              <StatCard label="Upcoming interviews (7 days)" value={stats.upcoming_interviews} delay={0.24} />
            </div>

            <div className="mt-8 rounded-lg border border-ink/10 bg-card-fill p-6">
              <h2 className="font-display text-lg text-ink">Applications by status</h2>
              <div className="mt-4 space-y-3">
                {APPLICATION_STATUS_ORDER.map((status) => (
                  <div key={status} className="flex items-center justify-between">
                    <StatusBadge status={status} theme={applicationStatusTheme} />
                    <span className="font-medium text-ink">{stats.applications_by_status[status] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
