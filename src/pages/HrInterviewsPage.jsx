import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useRef, useState } from 'react'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import Select from '../components/Select'
import TableCardSkeleton from '../components/skeletons/TableCardSkeleton'
import TableRowSkeleton from '../components/skeletons/TableRowSkeleton'
import StatusBadge from '../components/StatusBadge'
import { useScrollShadow } from '../hooks/useScrollShadow'
import { useThemeColors } from '../hooks/useThemeColors'
import api from '../lib/axios'
import { INTERVIEW_STATUS_LABELS, INTERVIEW_STATUS_ORDER } from '../lib/interviewStatus'
import { STALE_TIME } from '../lib/queryClient'

const SELECT_CLASSES =
  'rounded-md border border-ink/15 bg-card-fill px-3 py-1.5 text-sm text-ink focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade disabled:opacity-60'

// The first identifying column and the Actions column stay pinned while the
// data columns between them scroll — the standard frozen-column pattern from
// spreadsheets so the row you're looking at (and the buttons you need) never
// scroll out of reach on a wide table. Sticky cells need their own opaque
// background (not just the wrapper's) since scrolling content passes behind
// them — `card-fill` (not `canvas`) so they stay seamless with the table
// wrapper's own background in themes where the two now differ (e.g. "warm");
// the shadow classes are applied conditionally (see useScrollShadow) so the
// "more content this way" cue only appears when it's actually true.
const STICKY_LEFT = 'sticky left-0 z-10 bg-card-fill'
const STICKY_RIGHT = 'sticky right-0 z-10 bg-card-fill'
const SHADOW_RIGHT = 'shadow-[6px_0_8px_-6px_rgba(0,0,0,0.12)]'
const SHADOW_LEFT = 'shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.12)]'

function isInterviewActive(interview) {
  return interview.status === 'scheduled' || interview.status === 'rescheduled'
}

export default function HrInterviewsPage() {
  const { interviewStatusTheme, badgeStyle } = useThemeColors()
  // A hardcoded near-black tint reads correctly on every light-canvas theme
  // but is the wrong direction on "dark" (darkening an already near-black
  // row is imperceptible) — `badgeStyle === 'outline'` is currently a
  // reliable proxy for "dark theme is active" without adding a new hook.
  const rowHoverColor = badgeStyle === 'outline' ? 'rgba(240, 242, 245, 0.04)' : 'rgba(22, 24, 29, 0.03)'
  const scrollRef = useRef(null)
  const { canScrollLeft, canScrollRight } = useScrollShadow(scrollRef)
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [actionError, setActionError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [updatingAction, setUpdatingAction] = useState(null)

  const [reschedulingInterview, setReschedulingInterview] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleError, setRescheduleError] = useState('')
  const [isRescheduling, setIsRescheduling] = useState(false)

  const queryKey = ['interviews', 'hr', page]

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey,
    queryFn: () => api.get('/interviews', { params: { per_page: 100, page } }).then((res) => res.data),
    staleTime: STALE_TIME.interviews,
    placeholderData: keepPreviousData,
  })

  const interviews = data?.data ?? []
  const meta = data?.meta ?? null

  const filteredInterviews = interviews.filter((interview) => {
    if (statusFilter && interview.status !== statusFilter) return false
    if (search) {
      const term = search.trim().toLowerCase()
      const name = interview.application?.candidate?.name?.toLowerCase() ?? ''
      const email = interview.application?.candidate?.email?.toLowerCase() ?? ''
      if (!name.includes(term) && !email.includes(term)) return false
    }
    return true
  })

  async function updateStatus(interview, status) {
    setUpdatingId(interview.id)
    setUpdatingAction(status)
    setActionError('')

    try {
      const { data } = await api.patch(`/interviews/${interview.id}`, { status })
      queryClient.setQueryData(queryKey, (old) =>
        old ? { ...old, data: old.data.map((existing) => (existing.id === interview.id ? data.data : existing)) } : old,
      )
      // HrApplicationsPage shows this same interview's status inline, and
      // completing/cancelling one shifts the HR dashboard's upcoming count.
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Unable to update this interview. Please try again.')
    } finally {
      setUpdatingId(null)
      setUpdatingAction(null)
    }
  }

  function openReschedule(interview) {
    setReschedulingInterview(interview)
    setRescheduleDate('')
    setRescheduleError('')
  }

  async function handleRescheduleSubmit(event, closeModal) {
    event.preventDefault()
    setRescheduleError('')
    setIsRescheduling(true)

    try {
      const { data } = await api.patch(`/interviews/${reschedulingInterview.id}`, {
        status: 'rescheduled',
        scheduled_at: new Date(rescheduleDate).toISOString(),
      })
      queryClient.setQueryData(queryKey, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((existing) => (existing.id === reschedulingInterview.id ? data.data : existing)),
            }
          : old,
      )
      // Same reasoning as updateStatus above: applications shows this
      // interview's status inline, and the new date can shift the
      // dashboard's "upcoming interviews (7 days)" count.
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      closeModal()
    } catch (error) {
      setRescheduleError(error.response?.data?.message ?? 'Unable to reschedule this interview. Please try again.')
    } finally {
      setIsRescheduling(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-3xl text-ink">
          Interviews. <span className="text-ink/50">All scheduled and past interviews.</span>
        </h1>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="status-filter" className="block text-xs font-medium text-ink/55">
              Status
            </label>
            <Select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={`mt-1 ${SELECT_CLASSES}`}
              options={[
                { value: '', label: 'All statuses' },
                ...INTERVIEW_STATUS_ORDER.map((status) => ({ value: status, label: INTERVIEW_STATUS_LABELS[status] })),
              ]}
            />
          </div>

          <div>
            <label htmlFor="search" className="block text-xs font-medium text-ink/55">
              Search
            </label>
            <div className="relative mt-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
              <input
                id="search"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or email…"
                className="w-56 rounded-md border border-ink/15 bg-card-fill py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-ink/35 focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade"
              />
            </div>
          </div>
        </div>

        {(isError || actionError) && (
          <p className="mt-4 text-rust">{actionError || 'Unable to load interviews. Please try again later.'}</p>
        )}

        {!isLoading && filteredInterviews.length === 0 && (
          <p className="mt-8 text-ink/55">No interviews match these filters.</p>
        )}

        {(isLoading || filteredInterviews.length > 0) && (
          <div className="mt-6 hidden overflow-x-auto rounded-lg border border-card-ring bg-card-fill md:block" ref={scrollRef}>
            <table className="min-w-full divide-y divide-ink/10">
              <thead>
                <tr className="text-left text-sm text-ink/70">
                  <th className={`px-6 py-3 font-medium ${STICKY_LEFT} ${canScrollRight ? SHADOW_RIGHT : ''}`}>Candidate</th>
                  <th className="px-6 py-3 font-medium">Job</th>
                  <th className="px-6 py-3 font-medium">Scheduled</th>
                  <th className="px-6 py-3 font-medium">Interviewer</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Notes</th>
                  <th className={`px-6 py-3 font-medium text-right ${STICKY_RIGHT} ${canScrollLeft ? SHADOW_LEFT : ''}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5 text-sm">
                {isLoading &&
                  Array.from({ length: 6 }).map((_, index) => <TableRowSkeleton key={index} columns={7} />)}
                {!isLoading &&
                  filteredInterviews.map((interview) => {
                  const isActive = isInterviewActive(interview)

                  return (
                    <motion.tr
                      key={interview.id}
                      whileHover={{ backgroundColor: rowHoverColor }}
                      transition={{ duration: 0.15 }}
                    >
                      <td className={`px-6 py-4 font-medium text-ink ${STICKY_LEFT} ${canScrollRight ? SHADOW_RIGHT : ''}`}>
                        {interview.application?.candidate?.name}
                      </td>
                      <td className="px-6 py-4 text-ink/55">{interview.application?.job?.title}</td>
                      <td className="px-6 py-4 text-ink/55">{new Date(interview.scheduled_at).toLocaleString()}</td>
                      <td className="px-6 py-4 text-ink/55">{interview.interviewer?.name}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={interview.status} theme={interviewStatusTheme} />
                      </td>
                      <td className="max-w-xs truncate px-6 py-4 text-ink/55">{interview.notes ?? '—'}</td>
                      <td className={`px-6 py-4 text-right ${STICKY_RIGHT} ${canScrollLeft ? SHADOW_LEFT : ''}`}>
                        {isActive ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              className="px-2 py-1"
                              onClick={() => updateStatus(interview, 'completed')}
                              disabled={updatingId === interview.id}
                              loading={updatingId === interview.id && updatingAction === 'completed'}
                            >
                              Mark completed
                            </Button>
                            <Button
                              variant="ghost"
                              className="px-2 py-1"
                              onClick={() => openReschedule(interview)}
                              disabled={updatingId === interview.id}
                            >
                              Reschedule
                            </Button>
                            <Button
                              variant="destructive"
                              className="px-2 py-1"
                              onClick={() => updateStatus(interview, 'cancelled')}
                              disabled={updatingId === interview.id}
                              loading={updatingId === interview.id && updatingAction === 'cancelled'}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <span className="text-ink/40">—</span>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {(isLoading || filteredInterviews.length > 0) && (
          <div className="mt-6 space-y-3 md:hidden">
            {isLoading &&
              Array.from({ length: 4 }).map((_, index) => <TableCardSkeleton key={index} />)}
            {!isLoading &&
              filteredInterviews.map((interview) => {
                const isActive = isInterviewActive(interview)

                return (
                  <div key={interview.id} className="rounded-lg border border-card-ring bg-card-fill p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">{interview.application?.candidate?.name}</p>
                        <p className="mt-0.5 text-sm text-ink/55">{interview.application?.job?.title}</p>
                      </div>
                      <StatusBadge status={interview.status} theme={interviewStatusTheme} />
                    </div>

                    <dl className="mt-3 space-y-1.5 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink/55">Scheduled</dt>
                        <dd className="text-right text-ink">{new Date(interview.scheduled_at).toLocaleString()}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink/55">Interviewer</dt>
                        <dd className="text-right text-ink">{interview.interviewer?.name ?? '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="shrink-0 text-ink/55">Notes</dt>
                        <dd className="text-right text-ink">{interview.notes ?? '—'}</dd>
                      </div>
                    </dl>

                    {isActive && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-3">
                        <Button
                          variant="ghost"
                          className="px-2 py-1"
                          onClick={() => updateStatus(interview, 'completed')}
                          disabled={updatingId === interview.id}
                          loading={updatingId === interview.id && updatingAction === 'completed'}
                        >
                          Mark completed
                        </Button>
                        <Button
                          variant="ghost"
                          className="px-2 py-1"
                          onClick={() => openReschedule(interview)}
                          disabled={updatingId === interview.id}
                        >
                          Reschedule
                        </Button>
                        <Button
                          variant="destructive"
                          className="px-2 py-1"
                          onClick={() => updateStatus(interview, 'cancelled')}
                          disabled={updatingId === interview.id}
                          loading={updatingId === interview.id && updatingAction === 'cancelled'}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        )}

        <Pagination meta={meta} onPageChange={setPage} />
      </main>

      {reschedulingInterview && (
        <Modal title="Reschedule interview" onClose={() => setReschedulingInterview(null)}>
          {(closeModal) => (
            <form onSubmit={(event) => handleRescheduleSubmit(event, closeModal)} className="space-y-4">
              <div>
                <label htmlFor="reschedule_at" className="block text-sm font-medium text-ink">
                  New date &amp; time
                </label>
                <input
                  id="reschedule_at"
                  type="datetime-local"
                  value={rescheduleDate}
                  onChange={(event) => setRescheduleDate(event.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-ink/15 bg-card-fill px-3 py-2 text-ink focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade"
                />
              </div>

              {rescheduleError && <p className="text-sm text-rust">{rescheduleError}</p>}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={isRescheduling}>
                  {isRescheduling ? 'Saving…' : 'Reschedule'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  )
}
