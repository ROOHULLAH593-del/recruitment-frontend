import { QueryClient } from '@tanstack/react-query'

// Per-data-type staleTime constants — how long cached data is shown as-is
// (instantly, no background refetch) before TanStack Query considers it
// stale and refetches the next time it's used. Not a single global value:
// how often something actually changes in this app varies a lot by type.
export const STALE_TIME = {
  // Job postings: an HR user posts/closes one occasionally, not continuously.
  // Long enough that flipping between the Jobs board and a job's detail page
  // (or paging through it) never re-shows a skeleton for data that's still
  // perfectly current.
  jobPostings: 5 * 60 * 1000,
  // Applications and interview data: a status can change at any time (HR
  // reviewing, scheduling), so cached data goes stale enough to prompt a
  // background refetch on the next visit within a much shorter window.
  applications: 30 * 1000,
  // Aggregate counts (candidate/HR dashboards): cheap to recompute and the
  // whole point of a dashboard is a reasonably current snapshot, so this
  // stays short too.
  dashboardStats: 30 * 1000,
  // Interview status can change whenever HR reviews or acts on one — same
  // cadence as applications. Kept as its own named constant because it's a
  // conceptually distinct resource, not because the number needs to differ.
  interviews: 30 * 1000,
  // A candidate's own profile only changes when they explicitly save this
  // exact form — nothing else writes to it — so a long staleTime never risks
  // showing outdated info. Saving also writes straight to the cache (see
  // ProfileForm), so this value is about revisit snappiness, not freshness.
  profile: 5 * 60 * 1000,
  // Invitations can be accepted/rejected by any admin at any time, and the
  // panel is the one place that state gets watched closely — short, like
  // applications/interviews, rather than long like job postings.
  invitations: 30 * 1000,
  // Staff deactivation/reactivation is the same kind of admin action as
  // accepting/rejecting an invitation — same short window.
  staff: 30 * 1000,
}

// Client errors (a definitive 404, a validation 422, a conflict 409) won't
// change on retry — retrying just delays showing the real outcome behind an
// extra ~1s backoff. Only retry once, and only for network failures or
// server errors, where a retry has an actual chance of succeeding.
function shouldRetry(failureCount, error) {
  if (failureCount >= 1) return false
  const status = error?.response?.status
  return status === undefined || status >= 500
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Falls back to this when a query doesn't set its own staleTime
      // (matches the shortest, safest end of the per-type values above,
      // rather than assuming something is slow-changing by default).
      staleTime: 30 * 1000,
      retry: shouldRetry,
    },
  },
})
