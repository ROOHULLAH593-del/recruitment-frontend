import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Sparkles, Video } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/Button'
import NoticeCard from '../components/NoticeCard'
import ScoreChip, { AiSemanticMatchChip } from '../components/ScoreChip'
import ApplicationCardSkeleton from '../components/skeletons/ApplicationCardSkeleton'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../hooks/useAuth'
import { useThemeColors } from '../hooks/useThemeColors'
import api from '../lib/axios'
import { STALE_TIME } from '../lib/queryClient'

// Reached from a status-change/offer notification email
// (ApplicationStatusChanged/OfferSent -> {FRONTEND_URL}/applications/{id}),
// as well as from anywhere in the app that links to a specific application.
// ApplicationPolicy::view() allows the application's own candidate and any
// staff member; a bad/stale id (404) or someone else's application (403)
// are shown as their own clean, in-app messages rather than a crash —
// ProtectedRoute already handles "not logged in at all" by redirecting to
// /login and back here afterwards.
export default function ApplicationDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { applicationStatusTheme } = useThemeColors()
  const isCandidate = user?.role === 'candidate'
  const backTo = isCandidate ? '/dashboard' : '/hr/applications'
  const backLabel = isCandidate ? 'my applications' : 'applications'

  const {
    data: application,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['applications', 'detail', id],
    queryFn: () => api.get(`/applications/${id}`).then((res) => res.data.data),
    staleTime: STALE_TIME.applications,
  })

  const notFound = error?.response?.status === 404
  const forbidden = error?.response?.status === 403
  const loadError = error && !notFound && !forbidden

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link to={backTo} className="text-sm font-medium text-jade hover:text-jade-deep">
          ← Back to {backLabel}
        </Link>

        {isLoading && (
          <div className="mt-6">
            <ApplicationCardSkeleton />
          </div>
        )}

        {notFound && (
          <NoticeCard
            title="Application not found"
            message="This application may have been withdrawn, or the link is no longer valid."
            linkTo={backTo}
            linkLabel="Go to dashboard"
          />
        )}

        {forbidden && (
          <NoticeCard
            title="You don't have access to this application"
            message="This link may be for a different account. Try logging in with the account it was sent to."
            linkTo={backTo}
            linkLabel="Go to dashboard"
          />
        )}

        {loadError && <p className="mt-6 text-rust">Unable to load this application. Please try again later.</p>}

        {application && (
          <div className="mt-6 rounded-lg border border-card-ring bg-card-fill p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                {/* Only these emails' candidate recipients ever land here in
                    practice, but the policy also allows staff (e.g. a
                    forwarded link) — for them, whose application this is
                    isn't otherwise on screen. */}
                {!isCandidate && <p className="text-sm text-ink/55">{application.candidate?.name}</p>}
                <Link to={`/jobs/${application.job.id}`} className="text-lg font-semibold text-ink hover:text-jade">
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
                {/* Whether this shows is driven entirely by the backend
                    including video_call — a cancelled interview simply
                    omits it, so there's no separate status check to
                    duplicate here. */}
                {application.interview?.video_call && (
                  <Link to={`/interviews/${application.interview.id}/call`} className="mt-2 inline-block">
                    <Button variant="secondary" icon={Video} className="px-3 py-1.5 text-xs">
                      Join Interview
                    </Button>
                  </Link>
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
          </div>
        )}
      </main>
    </div>
  )
}
