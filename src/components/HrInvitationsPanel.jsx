import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Search } from 'lucide-react'
import { useState } from 'react'
import { useThemeColors } from '../hooks/useThemeColors'
import { useToast } from '../hooks/useToast'
import api from '../lib/axios'
import { STALE_TIME } from '../lib/queryClient'
import Button from './Button'
import ConfirmDialog from './ConfirmDialog'
import Select from './Select'
import TableCardSkeleton from './skeletons/TableCardSkeleton'

const ROLE_OPTIONS = [
  { value: 'hr', label: 'HR' },
  { value: 'assistant_hr', label: 'Assistant HR' },
]

const ROLE_LABELS = { hr: 'HR', assistant_hr: 'Assistant HR' }

// "Pending Requests" narrows to invitations still awaiting someone's
// action (pending_use: link not yet used; pending_review: submitted,
// awaiting Admin) — approved/rejected/expired ones are resolved history,
// not requests, so they stay out even under this filter.
const PENDING_INVITATION_STATUSES = ['pending_use', 'pending_review']

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'deactivated', label: 'Deactivated' },
  { value: 'pending', label: 'Pending Requests' },
]

const SELECT_CLASSES =
  'mt-1 block w-40 rounded-md border border-ink/15 bg-card-fill px-3 py-2 text-left text-sm text-ink focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade'

// Small standalone status pill, styled from the theme's actual semantic
// colors (positive/caution/negative) rather than the brand accent (jade) —
// invitation status is a state, not a brand moment. Respects the active
// theme's badgeStyle (outline under "dark", filled everywhere else) the
// same way StatusBadge does, just without StatusBadge's GSAP color-morph
// (nothing here needs to animate between renders — the list re-fetches
// wholesale after every accept/reject instead).
function InvitationStatusPill({ status, palette, badgeStyle }) {
  const isOutline = badgeStyle === 'outline'

  const tones = {
    pending_use: null,
    pending_review: { tint: palette.cautionTint, deep: palette.cautionDeep, base: palette.caution },
    approved: { tint: palette.positiveTint, deep: palette.positiveDeep, base: palette.positive },
    rejected: { tint: palette.negativeTint, deep: palette.negativeDeep, base: palette.negative },
    expired: null,
  }
  const labels = {
    pending_use: 'Awaiting use',
    pending_review: 'Pending review',
    approved: 'Approved',
    rejected: 'Rejected',
    expired: 'Expired',
  }

  const tone = tones[status]
  const label = labels[status] ?? status

  if (!tone) {
    const neutralStyle = isOutline
      ? { backgroundColor: 'transparent', color: palette.ink, opacity: 0.6, border: `1.5px solid ${palette.ink}` }
      : undefined

    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${isOutline ? '' : 'bg-ink/5 text-ink/60'}`}
        style={neutralStyle}
      >
        {label}
      </span>
    )
  }

  const style = isOutline
    ? { backgroundColor: 'transparent', color: tone.base, border: `1.5px solid ${tone.base}` }
    : { backgroundColor: tone.tint, color: tone.deep }

  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={style}>
      {label}
    </span>
  )
}

// Same shape as InvitationStatusPill (theme-driven semantic color, not the
// brand accent; respects badgeStyle), for the same reason: account status is
// a state, not a brand moment. Kept as its own small component rather than
// generalizing InvitationStatusPill — the two pills happen to share a look
// today, but they're pills for two different, unrelated kinds of status.
function StaffStatusPill({ isDeactivated, palette, badgeStyle }) {
  const isOutline = badgeStyle === 'outline'
  const tone = isDeactivated
    ? { tint: palette.negativeTint, deep: palette.negativeDeep, base: palette.negative }
    : { tint: palette.positiveTint, deep: palette.positiveDeep, base: palette.positive }

  const style = isOutline
    ? { backgroundColor: 'transparent', color: tone.base, border: `1.5px solid ${tone.base}` }
    : { backgroundColor: tone.tint, color: tone.deep }

  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={style}>
      {isDeactivated ? 'Deactivated' : 'Active'}
    </span>
  )
}

async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text)
}

export default function HrInvitationsPanel() {
  const { palette, badgeStyle } = useThemeColors()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [roleOffered, setRoleOffered] = useState('hr')
  const [isCreating, setIsCreating] = useState(false)
  const [createdLink, setCreatedLink] = useState(null)
  const [justCopiedCreated, setJustCopiedCreated] = useState(false)

  const [actingId, setActingId] = useState(null)
  const [confirmingReject, setConfirmingReject] = useState(null)
  const [search, setSearch] = useState('')

  const [actingStaffId, setActingStaffId] = useState(null)
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(null)

  const [filter, setFilter] = useState('all')

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => api.get('/admin/invitations', { params: { per_page: 100 } }).then((res) => res.data),
    staleTime: STALE_TIME.invitations,
  })

  const invitations = data?.data ?? []

  const {
    data: staffData,
    isLoading: isStaffLoading,
    isError: isStaffError,
  } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/admin/staff', { params: { per_page: 100 } }).then((res) => res.data),
    staleTime: STALE_TIME.staff,
  })

  const staff = staffData?.data ?? []

  // Which section(s) the "Filter" control leaves visible — "Active" and
  // "Deactivated" are staff-only categories, "Pending Requests" is
  // invitations-only, so each hides the section the filter doesn't apply
  // to entirely, rather than leaving it visible-but-empty.
  const showInvitations = filter === 'all' || filter === 'pending'
  const showStaff = filter === 'all' || filter === 'active' || filter === 'deactivated'

  const statusFilteredInvitations =
    filter === 'pending'
      ? invitations.filter((invitation) => PENDING_INVITATION_STATUSES.includes(invitation.status))
      : invitations

  const filteredInvitations = statusFilteredInvitations.filter((invitation) => {
    if (!search) return true
    const term = search.trim().toLowerCase()
    const name = invitation.applicant_name?.toLowerCase() ?? ''
    const email = invitation.applicant_email?.toLowerCase() ?? ''
    return name.includes(term) || email.includes(term)
  })

  const filteredStaff = staff.filter((member) => {
    if (filter === 'active') return member.deactivated_at === null
    if (filter === 'deactivated') return member.deactivated_at !== null
    return true
  })

  function refreshInvitations() {
    queryClient.invalidateQueries({ queryKey: ['invitations'] })
  }

  async function handleCreate(event) {
    event.preventDefault()
    setIsCreating(true)
    setCreatedLink(null)
    setJustCopiedCreated(false)

    try {
      const { data } = await api.post('/admin/invitations', { role_offered: roleOffered })
      setCreatedLink(`${window.location.origin}/staff/join/${data.data.token}`)
      refreshInvitations()
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Unable to create invitation.', 'negative')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleCopyCreatedLink() {
    try {
      await copyToClipboard(createdLink)
      setJustCopiedCreated(true)
      setTimeout(() => setJustCopiedCreated(false), 2000)
    } catch {
      showToast('Unable to copy the link. Please copy it manually.', 'negative')
    }
  }

  async function handleCopyExistingLink(token) {
    try {
      await copyToClipboard(`${window.location.origin}/staff/join/${token}`)
      showToast('Link copied to clipboard.', 'positive')
    } catch {
      showToast('Unable to copy the link. Please copy it manually.', 'negative')
    }
  }

  async function handleAccept(invitation) {
    setActingId(invitation.id)

    try {
      await api.post(`/admin/invitations/${invitation.id}/accept`)
      showToast(`${invitation.applicant_name} was added as ${ROLE_LABELS[invitation.role_offered]}.`, 'positive')
      refreshInvitations()
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Unable to accept this invitation.', 'negative')
    } finally {
      setActingId(null)
    }
  }

  async function confirmReject(invitation) {
    setActingId(invitation.id)

    try {
      await api.post(`/admin/invitations/${invitation.id}/reject`)
      showToast('Invitation rejected.', 'positive')
      refreshInvitations()
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Unable to reject this invitation.', 'negative')
    } finally {
      setActingId(null)
    }
  }

  function refreshStaff() {
    queryClient.invalidateQueries({ queryKey: ['staff'] })
  }

  // No confirmation step — reversible any time by deactivating again, and
  // it only restores access, it doesn't touch or expose anything on its
  // own. Deactivating is the one of these two actions with real, immediate
  // consequences (it signs the account out everywhere), so that's the one
  // that gets ConfirmDialog.
  async function handleReactivate(member) {
    setActingStaffId(member.id)

    try {
      await api.post(`/admin/staff/${member.id}/reactivate`)
      showToast(`${member.name} can log in again.`, 'positive')
      refreshStaff()
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Unable to reactivate this account.', 'negative')
    } finally {
      setActingStaffId(null)
    }
  }

  async function confirmDeactivate(member) {
    setActingStaffId(member.id)

    try {
      await api.post(`/admin/staff/${member.id}/deactivate`)
      showToast(`${member.name} has been deactivated and signed out everywhere.`, 'positive')
      refreshStaff()
    } catch (error) {
      showToast(error.response?.data?.message ?? 'Unable to deactivate this account.', 'negative')
    } finally {
      setActingStaffId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium text-ink/50">Invite someone</p>
        <form onSubmit={handleCreate} className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="role_offered" className="block text-xs font-medium text-ink/55">
              Role to offer
            </label>
            <Select
              id="role_offered"
              name="role_offered"
              value={roleOffered}
              onChange={(event) => setRoleOffered(event.target.value)}
              options={ROLE_OPTIONS}
              className={SELECT_CLASSES}
            />
          </div>
          <Button type="submit" variant="primary" loading={isCreating}>
            {isCreating ? 'Creating…' : 'Create invite link'}
          </Button>
        </form>

        {createdLink && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-jade/30 bg-jade-tint px-3 py-2">
            <input
              readOnly
              value={createdLink}
              onFocus={(event) => event.target.select()}
              aria-label="Shareable invitation link"
              className="min-w-0 flex-1 truncate bg-transparent text-sm text-jade-deep outline-none"
            />
            <Button
              type="button"
              variant="ghost"
              icon={justCopiedCreated ? Check : Copy}
              onClick={handleCopyCreatedLink}
              className="shrink-0 px-2 py-1 text-jade-deep"
            >
              {justCopiedCreated ? 'Copied' : 'Copy'}
            </Button>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="staff-filter" className="block text-xs font-medium text-ink/55">
          Filter
        </label>
        <Select
          id="staff-filter"
          name="staff-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          options={FILTER_OPTIONS}
          className={SELECT_CLASSES}
        />
      </div>

      {showInvitations && (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-xs font-medium text-ink/50">
              {filter === 'pending' ? 'Pending requests' : 'All invitations'}
            </p>

            <div>
              <label htmlFor="invitation-search" className="block text-xs font-medium text-ink/55">
                Search
              </label>
              <div className="relative mt-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
                <input
                  id="invitation-search"
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name or email…"
                  className="w-56 rounded-md border border-ink/15 bg-card-fill py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-ink/35 focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade"
                />
              </div>
            </div>
          </div>

          {isError && <p className="mt-3 text-sm text-rust">Unable to load invitations. Please try again later.</p>}
          {!isLoading && !isError && statusFilteredInvitations.length === 0 && (
            <p className="mt-3 text-sm text-ink/55">
              {filter === 'pending' ? 'No pending requests.' : 'No invitations yet.'}
            </p>
          )}
          {!isLoading && !isError && statusFilteredInvitations.length > 0 && filteredInvitations.length === 0 && (
            <p className="mt-3 text-sm text-ink/55">No invitations match your search.</p>
          )}

          <div className="mt-3 space-y-2">
            {isLoading &&
              Array.from({ length: 3 }).map((_, index) => <TableCardSkeleton key={index} />)}

            {!isLoading &&
              filteredInvitations.map((invitation) => (
                <div key={invitation.id} className="rounded-md border border-ink/10 bg-card-fill p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {invitation.applicant_name ?? 'Not yet used'}{' '}
                        <span className="font-normal text-ink/50">— {ROLE_LABELS[invitation.role_offered]}</span>
                      </p>
                      {invitation.applicant_email && (
                        <p className="truncate text-xs text-ink/55">{invitation.applicant_email}</p>
                      )}
                      {!invitation.applicant_email && (
                        <p className="text-xs text-ink/40">
                          Invited by {invitation.invited_by?.name} · expires{' '}
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <InvitationStatusPill status={invitation.status} palette={palette} badgeStyle={badgeStyle} />
                  </div>

                  {invitation.status === 'pending_use' && (
                    <div className="mt-3 border-t border-ink/10 pt-3">
                      <Button
                        variant="ghost"
                        icon={Copy}
                        onClick={() => handleCopyExistingLink(invitation.token)}
                        className="px-2 py-1 text-xs"
                      >
                        Copy link
                      </Button>
                    </div>
                  )}

                  {invitation.status === 'pending_review' && (
                    <div className="mt-3 flex gap-2 border-t border-ink/10 pt-3">
                      <Button
                        variant="primary"
                        loading={actingId === invitation.id}
                        onClick={() => handleAccept(invitation)}
                        className="px-3 py-1 text-xs"
                      >
                        Accept
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={actingId === invitation.id}
                        onClick={() => setConfirmingReject(invitation)}
                        className="px-3 py-1 text-xs"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {showStaff && (
        <div>
          <p className="text-xs font-medium text-ink/50">
            {filter === 'active' ? 'Active staff' : filter === 'deactivated' ? 'Deactivated staff' : 'Current staff'}
          </p>

          {isStaffError && <p className="mt-3 text-sm text-rust">Unable to load staff. Please try again later.</p>}
          {!isStaffLoading && !isStaffError && filteredStaff.length === 0 && (
            <p className="mt-3 text-sm text-ink/55">
              {filter === 'active'
                ? 'No active staff.'
                : filter === 'deactivated'
                  ? 'No deactivated accounts.'
                  : 'No HR or Assistant HR accounts yet.'}
            </p>
          )}

          <div className="mt-3 space-y-2">
            {isStaffLoading &&
              Array.from({ length: 2 }).map((_, index) => <TableCardSkeleton key={index} />)}

            {!isStaffLoading &&
              filteredStaff.map((member) => (
                <div key={member.id} className="rounded-md border border-ink/10 bg-card-fill p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {member.name} <span className="font-normal text-ink/50">— {ROLE_LABELS[member.role]}</span>
                      </p>
                      <p className="truncate text-xs text-ink/55">{member.email}</p>
                    </div>
                    <StaffStatusPill
                      isDeactivated={member.deactivated_at !== null}
                      palette={palette}
                      badgeStyle={badgeStyle}
                    />
                  </div>

                  <div className="mt-3 border-t border-ink/10 pt-3">
                    {member.deactivated_at === null ? (
                      <Button
                        variant="destructive"
                        disabled={actingStaffId === member.id}
                        onClick={() => setConfirmingDeactivate(member)}
                        className="px-3 py-1 text-xs"
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        loading={actingStaffId === member.id}
                        onClick={() => handleReactivate(member)}
                        className="px-3 py-1 text-xs"
                      >
                        Reactivate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {confirmingReject && (
        <ConfirmDialog
          title="Reject invitation"
          message={`Reject ${confirmingReject.applicant_name ?? 'this'}'s application to join as ${ROLE_LABELS[confirmingReject.role_offered]}? This cannot be undone.`}
          confirmLabel="Reject"
          variant="destructive"
          onConfirm={() => confirmReject(confirmingReject)}
          onClose={() => setConfirmingReject(null)}
        />
      )}

      {confirmingDeactivate && (
        <ConfirmDialog
          title="Deactivate account"
          message={`Deactivate ${confirmingDeactivate.name}'s account? They'll be signed out everywhere immediately and won't be able to log in until reactivated. Their job postings, interviews and application reviews stay exactly as they are.`}
          confirmLabel="Deactivate"
          variant="destructive"
          onConfirm={() => confirmDeactivate(confirmingDeactivate)}
          onClose={() => setConfirmingDeactivate(null)}
        />
      )}
    </div>
  )
}
