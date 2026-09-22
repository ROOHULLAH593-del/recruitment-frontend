import { useQuery } from '@tanstack/react-query'
import { Video } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/Button'
import NoticeCard from '../components/NoticeCard'
import SkeletonBlock from '../components/skeletons/SkeletonBlock'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../hooks/useAuth'
import { useThemeColors } from '../hooks/useThemeColors'
import api from '../lib/axios'
import { STALE_TIME } from '../lib/queryClient'

// Reached from the interview-scheduled/-rescheduled notification email
// (InterviewScheduled -> {FRONTEND_URL}/interviews/{id}). Deliberately a
// separate route from /interviews/:id/call: this shows the interview's
// details (and a way into the call when one's live), the other route is the
// call itself. Same 404/403-as-a-clean-message treatment as
// ApplicationDetailPage, for the same reason (InterviewPolicy::view()
// allows the interview's own candidate and staff, nobody else).
export default function InterviewDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { interviewStatusTheme } = useThemeColors()
  const isCandidate = user?.role === 'candidate'
  const backTo = isCandidate ? '/dashboard' : '/hr/interviews'
  const backLabel = isCandidate ? 'my applications' : 'interviews'

  const {
    data: interview,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['interviews', 'detail', id],
    queryFn: () => api.get(`/interviews/${id}`).then((res) => res.data.data),
    staleTime: STALE_TIME.interviews,
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
          <div className="mt-6 rounded-lg border border-card-ring bg-card-fill p-8">
            <SkeletonBlock className="h-5 w-2/5" />
            <SkeletonBlock className="mt-4 h-4 w-1/3" />
            <SkeletonBlock className="mt-2 h-4 w-1/4" />
          </div>
        )}

        {notFound && (
          <NoticeCard
            title="Interview not found"
            message="This interview may have been removed, or the link is no longer valid."
            linkTo={backTo}
            linkLabel="Go to dashboard"
          />
        )}

        {forbidden && (
          <NoticeCard
            title="You don't have access to this interview"
            message="This link may be for a different account. Try logging in with the account it was sent to."
            linkTo={backTo}
            linkLabel="Go to dashboard"
          />
        )}

        {loadError && <p className="mt-6 text-rust">Unable to load this interview. Please try again later.</p>}

        {interview && (
          <div className="mt-6 rounded-lg border border-card-ring bg-card-fill p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                {!isCandidate && <p className="text-sm text-ink/55">{interview.application?.candidate?.name}</p>}
                <Link
                  to={`/jobs/${interview.application?.job?.id}`}
                  className="text-lg font-semibold text-ink hover:text-jade"
                >
                  {interview.application?.job?.title}
                </Link>
              </div>
              <StatusBadge status={interview.status} theme={interviewStatusTheme} />
            </div>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink/55">Scheduled</dt>
                <dd className="font-medium text-ink">{new Date(interview.scheduled_at).toLocaleString()}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink/55">Interviewer</dt>
                <dd className="font-medium text-ink">{interview.interviewer?.name ?? '—'}</dd>
              </div>
              {interview.notes && (
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-ink/55">Notes</dt>
                  <dd className="text-right font-medium text-ink">{interview.notes}</dd>
                </div>
              )}
            </dl>

            {/* Driven entirely by video_call's presence, not a client-side
                re-check of status — the backend already omits it once the
                interview is cancelled. */}
            {interview.video_call && (
              <Link to={`/interviews/${interview.id}/call`} className="mt-6 inline-block">
                <Button variant="primary" icon={Video}>
                  Join Interview
                </Button>
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
