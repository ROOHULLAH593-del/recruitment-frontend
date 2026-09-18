import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CalendarClock, Search, Sparkles, UserRound } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import ScoreChip, { AiSemanticMatchChip } from '../components/ScoreChip'
import Select from '../components/Select'
import TableCardSkeleton from '../components/skeletons/TableCardSkeleton'
import TableRowSkeleton from '../components/skeletons/TableRowSkeleton'
import StatusBadge from '../components/StatusBadge'
import { useScrollShadow } from '../hooks/useScrollShadow'
import { useThemeColors } from '../hooks/useThemeColors'
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_ORDER } from '../lib/applicationStatus'
import api from '../lib/axios'
import { STALE_TIME } from '../lib/queryClient'

const ELIGIBLE_FOR_INTERVIEW = APPLICATION_STATUS_ORDER.slice(1)

const SELECT_CLASSES =
  'rounded-md border border-ink/15 bg-card-fill px-3 py-1.5 text-sm text-ink focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade disabled:opacity-60'

const EDUCATION_LABELS = {
  highschool: 'High School',
  bachelors: "Bachelor's degree",
  masters: "Master's degree",
  phd: 'PhD',
}

// First identifying column (Candidate) and the rightmost, most-actionable
// column (Interview — this table has no column literally named "Actions",
// but it's the one holding the Schedule Interview button) stay pinned while
// the data columns between them scroll. See HrInterviewsPage for the fuller
// note on why sticky cells need their own opaque background — `card-fill`
// (not `canvas`) so they stay seamless with the table wrapper's own
// background in themes where the two now differ (e.g. "warm").
const STICKY_LEFT = 'sticky left-0 z-10 bg-card-fill'
const STICKY_RIGHT = 'sticky right-0 z-10 bg-card-fill'
const SHADOW_RIGHT = 'shadow-[6px_0_8px_-6px_rgba(0,0,0,0.12)]'
const SHADOW_LEFT = 'shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.12)]'

export default function HrApplicationsPage() {
  const { applicationStatusTheme, interviewStatusTheme, badgeStyle } = useThemeColors()
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
  const [jobFilter, setJobFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  const [schedulingApplication, setSchedulingApplication] = useState(null)
  const [scheduleForm, setScheduleForm] = useState({ scheduled_at: '', notes: '' })
  const [scheduleError, setScheduleError] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)

  const [viewingProfile, setViewingProfile] = useState(null)

  const [rejectingApplication, setRejectingApplication] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionError, setRejectionError] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  const queryKey = ['applications', 'hr', page]

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey,
    queryFn: () => api.get('/applications', { params: { per_page: 100, page } }).then((res) => res.data),
    staleTime: STALE_TIME.applications,
    placeholderData: keepPreviousData,
  })

  const applications = data?.data ?? []
  const meta = data?.meta ?? null

  const jobs = useMemo(() => {
    const byId = new Map()
    ;(data?.data ?? []).forEach((application) => {
      if (application.job) byId.set(application.job.id, application.job)
    })
    return [...byId.values()]
  }, [data])

  const filteredApplications = applications.filter((application) => {
    if (jobFilter && String(application.job?.id) !== jobFilter) return false
    if (statusFilter && application.status !== statusFilter) return false
    if (search) {
      const term = search.trim().toLowerCase()
      const name = application.candidate?.name?.toLowerCase() ?? ''
      const email = application.candidate?.email?.toLowerCase() ?? ''
      if (!name.includes(term) && !email.includes(term)) return false
    }
    return true
  })

  async function handleStatusChange(application, newStatus) {
    setUpdatingId(application.id)
    setActionError('')

    try {
      const { data } = await api.patch(`/applications/${application.id}/status`, { status: newStatus })
      queryClient.setQueryData(queryKey, (old) =>
        old
          ? { ...old, data: old.data.map((existing) => (existing.id === application.id ? data.data : existing)) }
          : old,
      )
      // A status change shifts the HR dashboard's "applications by status" breakdown.
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Unable to update status. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  // Rejecting is the one transition that doesn't fire immediately from the
  // status Select — it opens a small modal for an optional note first,
  // matching the confirmed design (rejection is the only status change worth
  // pausing for, since it's the one a candidate actually reads an
  // explanation about).
  function handleStatusSelectChange(application, newStatus) {
    if (newStatus === 'rejected') {
      setRejectingApplication(application)
      setRejectionReason('')
      setRejectionError('')
    } else {
      handleStatusChange(application, newStatus)
    }
  }

  async function handleRejectSubmit(event, closeModal) {
    event.preventDefault()
    setRejectionError('')
    setIsRejecting(true)

    try {
      const { data } = await api.patch(`/applications/${rejectingApplication.id}/status`, {
        status: 'rejected',
        rejection_reason: rejectionReason.trim() || null,
      })
      queryClient.setQueryData(queryKey, (old) =>
        old
          ? { ...old, data: old.data.map((existing) => (existing.id === rejectingApplication.id ? data.data : existing)) }
          : old,
      )
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      closeModal()
    } catch (error) {
      setRejectionError(error.response?.data?.message ?? 'Unable to reject this application. Please try again.')
    } finally {
      setIsRejecting(false)
    }
  }

  function openScheduleModal(application) {
    setSchedulingApplication(application)
    setScheduleForm({ scheduled_at: '', notes: '' })
    setScheduleError('')
  }

  async function handleScheduleSubmit(event, closeModal) {
    event.preventDefault()
    setScheduleError('')
    setIsScheduling(true)

    try {
      await api.post(`/applications/${schedulingApplication.id}/interview`, {
        scheduled_at: new Date(scheduleForm.scheduled_at).toISOString(),
        notes: scheduleForm.notes || null,
      })

      const { data } = await api.get(`/applications/${schedulingApplication.id}`)
      queryClient.setQueryData(queryKey, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((existing) => (existing.id === schedulingApplication.id ? data.data : existing)),
            }
          : old,
      )
      // The new interview needs to show up on the (separately cached)
      // Interviews page, and shifts the HR dashboard's upcoming-interviews count.
      queryClient.invalidateQueries({ queryKey: ['interviews'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      closeModal()
    } catch (error) {
      setScheduleError(error.response?.data?.message ?? 'Unable to schedule this interview. Please try again.')
    } finally {
      setIsScheduling(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-3xl text-ink">Applications</h1>
        <p className="mt-1 text-sm text-ink/50">Review and manage candidate applications.</p>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="job-filter" className="block text-xs font-medium text-ink/55">
              Job
            </label>
            <Select
              id="job-filter"
              value={jobFilter}
              onChange={(event) => setJobFilter(event.target.value)}
              className={`mt-1 ${SELECT_CLASSES}`}
              options={[{ value: '', label: 'All jobs' }, ...jobs.map((job) => ({ value: String(job.id), label: job.title }))]}
            />
          </div>

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
                ...APPLICATION_STATUS_ORDER.map((status) => ({ value: status, label: APPLICATION_STATUS_LABELS[status] })),
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
          <p className="mt-4 text-rust">{actionError || 'Unable to load applications. Please try again later.'}</p>
        )}

        {!isLoading && filteredApplications.length === 0 && (
          <p className="mt-8 text-ink/55">No applications match these filters.</p>
        )}

        {(isLoading || filteredApplications.length > 0) && (
          <div className="mt-6 hidden overflow-x-auto rounded-lg border border-card-ring bg-card-fill md:block" ref={scrollRef}>
            <table className="min-w-full divide-y divide-ink/10">
              <thead>
                <tr className="text-left text-sm text-ink/70">
                  <th className={`px-6 py-3 font-medium ${STICKY_LEFT} ${canScrollRight ? SHADOW_RIGHT : ''}`}>Candidate</th>
                  <th className="px-6 py-3 font-medium">Job</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Match score</th>
                  <th className="px-6 py-3 font-medium">
                    <span className="flex items-center gap-1">
                      <Sparkles size={12} />
                      AI Semantic Match
                    </span>
                  </th>
                  <th className="px-6 py-3 font-medium">Applied</th>
                  <th className="px-6 py-3 font-medium">Update status</th>
                  <th className={`px-6 py-3 font-medium ${STICKY_RIGHT} ${canScrollLeft ? SHADOW_LEFT : ''}`}>Interview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5 text-sm">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, index) => <TableRowSkeleton key={index} columns={8} />)
                  : filteredApplications.map((application) => (
                  <motion.tr
                    key={application.id}
                    whileHover={{ backgroundColor: rowHoverColor }}
                    transition={{ duration: 0.15 }}
                  >
                    <td className={`px-6 py-4 font-medium text-ink ${STICKY_LEFT} ${canScrollRight ? SHADOW_RIGHT : ''}`}>
                      <div>{application.candidate?.name}</div>
                      <button
                        type="button"
                        onClick={() => setViewingProfile(application)}
                        className="mt-0.5 flex items-center gap-1 text-xs font-medium text-jade hover:text-jade-deep"
                      >
                        <UserRound size={12} />
                        View Profile
                      </button>
                    </td>
                    <td className="px-6 py-4 text-ink/55">{application.job?.title}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={application.status} theme={applicationStatusTheme} />
                    </td>
                    <td className="px-6 py-4">
                      <ScoreChip score={application.match_score} />
                    </td>
                    <td className="px-6 py-4">
                      <AiSemanticMatchChip score={application.semantic_match_score} />
                    </td>
                    <td className="px-6 py-4 text-ink/55">
                      {new Date(application.applied_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Select
                        value={application.status}
                        disabled={updatingId === application.id || application.allowed_status_transitions.length === 0}
                        onChange={(event) => handleStatusSelectChange(application, event.target.value)}
                        className={SELECT_CLASSES}
                        options={[
                          { value: application.status, label: APPLICATION_STATUS_LABELS[application.status] },
                          ...application.allowed_status_transitions.map((status) => ({
                            value: status,
                            label: APPLICATION_STATUS_LABELS[status],
                          })),
                        ]}
                      />
                    </td>
                    <td className={`px-6 py-4 ${STICKY_RIGHT} ${canScrollLeft ? SHADOW_LEFT : ''}`}>
                      {!ELIGIBLE_FOR_INTERVIEW.includes(application.status) ? (
                        <span className="text-ink/55">—</span>
                      ) : application.interview ? (
                        <StatusBadge status={application.interview.status} theme={interviewStatusTheme} />
                      ) : (
                        <Button variant="ghost" icon={CalendarClock} className="px-2 py-1" onClick={() => openScheduleModal(application)}>
                          Schedule Interview
                        </Button>
                      )}
                    </td>
                  </motion.tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}

        {(isLoading || filteredApplications.length > 0) && (
          <div className="mt-6 space-y-3 md:hidden">
            {isLoading &&
              Array.from({ length: 4 }).map((_, index) => <TableCardSkeleton key={index} />)}
            {!isLoading &&
              filteredApplications.map((application) => {
                return (
                  <div key={application.id} className="rounded-lg border border-card-ring bg-card-fill p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">{application.candidate?.name}</p>
                        <p className="mt-0.5 text-sm text-ink/55">{application.job?.title}</p>
                        <button
                          type="button"
                          onClick={() => setViewingProfile(application)}
                          className="mt-1 flex items-center gap-1 text-xs font-medium text-jade hover:text-jade-deep"
                        >
                          <UserRound size={12} />
                          View Profile
                        </button>
                      </div>
                      <StatusBadge status={application.status} theme={applicationStatusTheme} />
                    </div>

                    <dl className="mt-3 space-y-1.5 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink/55">Match score</dt>
                        <dd className="text-right text-ink">
                          <ScoreChip score={application.match_score} />
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="flex items-center gap-1 text-ink/55">
                          <Sparkles size={12} />
                          AI Semantic Match
                        </dt>
                        <dd className="text-right text-ink">
                          <AiSemanticMatchChip score={application.semantic_match_score} />
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink/55">Applied</dt>
                        <dd className="text-right text-ink">{new Date(application.applied_at).toLocaleDateString()}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 border-t border-ink/10 pt-3">
                      <label className="block text-xs font-medium text-ink/55">Update status</label>
                      <Select
                        value={application.status}
                        disabled={updatingId === application.id || application.allowed_status_transitions.length === 0}
                        onChange={(event) => handleStatusSelectChange(application, event.target.value)}
                        className={`mt-1 w-full ${SELECT_CLASSES}`}
                        options={[
                          { value: application.status, label: APPLICATION_STATUS_LABELS[application.status] },
                          ...application.allowed_status_transitions.map((status) => ({
                            value: status,
                            label: APPLICATION_STATUS_LABELS[status],
                          })),
                        ]}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink/55">Interview</span>
                      {!ELIGIBLE_FOR_INTERVIEW.includes(application.status) ? (
                        <span className="text-ink/55">—</span>
                      ) : application.interview ? (
                        <StatusBadge status={application.interview.status} theme={interviewStatusTheme} />
                      ) : (
                        <Button variant="ghost" icon={CalendarClock} className="px-2 py-1" onClick={() => openScheduleModal(application)}>
                          Schedule Interview
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        <Pagination meta={meta} onPageChange={setPage} />
      </main>

      {schedulingApplication && (
        <Modal
          title={`Schedule interview — ${schedulingApplication.candidate?.name}`}
          onClose={() => setSchedulingApplication(null)}
        >
          {(closeModal) => (
            <form onSubmit={(event) => handleScheduleSubmit(event, closeModal)} className="space-y-4">
              <div>
                <label htmlFor="scheduled_at" className="block text-sm font-medium text-ink">
                  Date &amp; time
                </label>
                <input
                  id="scheduled_at"
                  type="datetime-local"
                  value={scheduleForm.scheduled_at}
                  onChange={(event) =>
                    setScheduleForm((previous) => ({ ...previous, scheduled_at: event.target.value }))
                  }
                  required
                  className="mt-1 block w-full rounded-md border border-ink/15 bg-card-fill px-3 py-2 text-ink focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-ink">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={scheduleForm.notes}
                  onChange={(event) => setScheduleForm((previous) => ({ ...previous, notes: event.target.value }))}
                  className="mt-1 block w-full rounded-md border border-ink/15 bg-card-fill px-3 py-2 text-ink focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade"
                />
              </div>

              {scheduleError && <p className="text-sm text-rust">{scheduleError}</p>}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={isScheduling}>
                  {isScheduling ? 'Scheduling…' : 'Schedule'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {viewingProfile && (
        <Modal title={`${viewingProfile.candidate?.name}'s profile`} onClose={() => setViewingProfile(null)} size="lg">
          <div className="space-y-5">
            <div>
              <p className="text-sm text-ink/55">{viewingProfile.candidate?.email}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={viewingProfile.status} theme={applicationStatusTheme} />
              <span className="text-sm text-ink/55">Match score:</span>
              <ScoreChip score={viewingProfile.match_score} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Sparkles size={13} className="text-violet-deep" />
              <span className="text-sm text-ink/55">AI Semantic Match:</span>
              <AiSemanticMatchChip score={viewingProfile.semantic_match_score} />
            </div>

            <div>
              <p className="text-xs font-medium text-ink/55">Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {viewingProfile.candidate?.candidate_profile?.skills?.length > 0 ? (
                  viewingProfile.candidate.candidate_profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-violet-tint px-3 py-1 text-xs font-medium text-violet-deep"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-ink/40">No skills listed.</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-ink/55">Education</p>
                <p className="mt-1 text-ink">
                  {EDUCATION_LABELS[viewingProfile.candidate?.candidate_profile?.education_level] ?? 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-ink/55">Experience</p>
                <p className="mt-1 text-ink">
                  {viewingProfile.candidate?.candidate_profile?.years_experience > 0
                    ? `${viewingProfile.candidate.candidate_profile.years_experience}+ years`
                    : 'Not specified'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-ink/55">Resume</p>
              <p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-line rounded-md border border-ink/10 bg-canvas p-3 text-sm text-ink/80">
                {viewingProfile.candidate?.candidate_profile?.resume_text || 'No resume text provided.'}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {rejectingApplication && (
        <Modal
          title={`Reject application — ${rejectingApplication.candidate?.name}`}
          onClose={() => setRejectingApplication(null)}
        >
          {(closeModal) => (
            <form onSubmit={(event) => handleRejectSubmit(event, closeModal)} className="space-y-4">
              <div>
                <label htmlFor="rejection_reason" className="block text-sm font-medium text-ink">
                  Add a note explaining why (optional)
                </label>
                <textarea
                  id="rejection_reason"
                  rows={4}
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="e.g. Looking for more experience in a specific skill area…"
                  className="mt-1 block w-full rounded-md border border-ink/15 bg-card-fill px-3 py-2 text-ink focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade"
                />
                <p className="mt-1 text-xs text-ink/55">
                  Shared with the candidate on their dashboard and in the rejection email.
                </p>
              </div>

              {rejectionError && <p className="text-sm text-rust">{rejectionError}</p>}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" loading={isRejecting}>
                  {isRejecting ? 'Rejecting…' : 'Reject Application'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  )
}
