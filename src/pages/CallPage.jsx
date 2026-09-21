import { useQuery } from '@tanstack/react-query'
import { PhoneOff, Video } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Spinner from '../components/Spinner'
import { useAuth } from '../hooks/useAuth'
import { STALE_TIME } from '../lib/queryClient'
import api from '../lib/axios'

// meet.jit.si (the free public server) doesn't reliably support the
// embedded-IFrame-API use case — anonymous rooms could unpredictably
// require lobby approval with no authenticated moderator able to grant it,
// confirmed via Jitsi's own documentation. JaaS (Jitsi as a Service) is
// their managed offering built for exactly this, authenticated via the
// signed JWT the backend now issues per interview.
const JITSI_DOMAIN = '8x8.vc'
const JITSI_SCRIPT_SRC = `https://${JITSI_DOMAIN}/external_api.js`

// Module-level so the script is only ever requested once per page load,
// no matter how many times a candidate/interviewer joins a call during
// this session — repeat visits reuse the same resolved promise.
let jitsiScriptPromise = null

function loadJitsiScript() {
  if (window.JitsiMeetExternalAPI) return Promise.resolve()

  jitsiScriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = JITSI_SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load the video call library.'))
    document.body.appendChild(script)
  })

  return jitsiScriptPromise
}

// GET /interviews/{id} — a dedicated single-interview lookup, authorized the
// same way as the list (InterviewPolicy::view(): the interview's own
// candidate, or staff). Originally this paginated /interviews and searched
// client-side, which worked for a candidate (their own list is always
// small) but silently failed for Admin/HR once the system-wide list grew
// past a single page and the requested interview just wasn't on it.
function useInterview(id) {
  return useQuery({
    queryKey: ['interviews', 'call', id],
    queryFn: async () => {
      const { data } = await api.get(`/interviews/${id}`)
      return data.data
    },
    staleTime: STALE_TIME.interviews,
  })
}

export default function CallPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: interview, isLoading, isError } = useInterview(id)

  const [hasJoined, setHasJoined] = useState(false)
  const [isJitsiReady, setIsJitsiReady] = useState(false)
  const [callError, setCallError] = useState('')
  const containerRef = useRef(null)
  const jitsiApiRef = useRef(null)

  const goBack = useCallback(() => {
    navigate(user?.role === 'candidate' ? '/dashboard' : '/hr/interviews', { replace: true })
  }, [navigate, user?.role])

  useEffect(() => {
    if (!hasJoined || !interview?.video_call) return

    let isCancelled = false

    loadJitsiScript()
      .then(() => {
        if (isCancelled || !containerRef.current) return

        const jitsiApi = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: interview.video_call.room,
          jwt: interview.video_call.jwt,
          parentNode: containerRef.current,
          // No userInfo.displayName here — the JWT's context.user already
          // carries the real signed-in name/email, and JaaS uses that
          // identity directly rather than a client-supplied one.
          configOverwrite: {
            // We already show our own pre-call screen — Jitsi's own
            // device-check page would just be a second one.
            prejoinConfig: { enabled: false },
            disableInviteFunctions: true,
            doNotStoreRoom: true,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'desktop',
              'fullscreen',
              'fodeviceselection',
              'chat',
              'tileview',
              'hangup',
            ],
          },
        })

        jitsiApiRef.current = jitsiApi
        jitsiApi.addEventListener('videoConferenceJoined', () => setIsJitsiReady(true))
        // Fires when the participant uses Jitsi's own hangup button —
        // routed through the same "leave" flow as our own button below.
        jitsiApi.addEventListener('readyToClose', goBack)
      })
      .catch(() => {
        if (!isCancelled) {
          setCallError('Unable to load the video call. Please check your connection and try again.')
        }
      })

    return () => {
      isCancelled = true
      jitsiApiRef.current?.dispose()
      jitsiApiRef.current = null
    }
  }, [hasJoined, interview?.video_call, goBack])

  function handleLeave() {
    jitsiApiRef.current?.dispose()
    jitsiApiRef.current = null
    goBack()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Spinner size={24} className="text-ink/40" />
      </div>
    )
  }

  if (isError || !interview) {
    return (
      <UnavailableScreen
        message="We couldn't find this interview, or you don't have access to it."
        onBack={goBack}
      />
    )
  }

  if (!interview.video_call) {
    return (
      <UnavailableScreen
        message="This interview's video call isn't available — it may have been cancelled."
        onBack={goBack}
      />
    )
  }

  if (!hasJoined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-sm rounded-lg border border-ink/10 bg-card-fill p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-jade-tint text-jade-deep">
            <Video size={22} />
          </div>
          <h1 className="mt-4 font-display text-xl text-ink">Ready to join?</h1>

          <dl className="mt-6 space-y-3 text-left text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink/55">Candidate</dt>
              <dd className="font-medium text-ink">{interview.application?.candidate?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink/55">Job</dt>
              <dd className="font-medium text-ink">{interview.application?.job?.title ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink/55">Scheduled</dt>
              <dd className="font-medium text-ink">{new Date(interview.scheduled_at).toLocaleString()}</dd>
            </div>
          </dl>

          <Button variant="primary" icon={Video} className="mt-6 w-full" onClick={() => setHasJoined(true)}>
            Join now
          </Button>
          <button type="button" onClick={goBack} className="mt-3 text-sm font-medium text-ink/55 hover:text-ink">
            Not now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink">
      <div className="relative flex-1">
        {!isJitsiReady && !callError && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink">
            <Spinner size={28} className="text-white/70" />
          </div>
        )}
        {callError && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink px-4">
            <div className="max-w-sm text-center">
              <p className="text-sm font-medium text-white">{callError}</p>
              <Button variant="secondary" className="mt-4" onClick={goBack}>
                Back
              </Button>
            </div>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>

      <div className="flex items-center justify-center border-t border-white/10 bg-ink/95 py-3">
        <Button variant="destructive" icon={PhoneOff} onClick={handleLeave}>
          Leave call
        </Button>
      </div>
    </div>
  )
}

function UnavailableScreen({ message, onBack }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-lg border border-ink/10 bg-card-fill p-8 text-center">
        <p className="text-sm font-medium text-ink/70">{message}</p>
        <Button variant="secondary" className="mt-4" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  )
}
