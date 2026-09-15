import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const MAX_RETRY_WINDOW_MS = 5000

// User-initiated scrolling (as opposed to the layout-driven kind the
// ResizeObserver below reacts to) — any of these mean the user has taken
// over, and re-imposing `targetY` over that the moment a resize next fires
// would mean this "helpful" retry is actively fighting them instead.
const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'keydown']

// Restoring scroll immediately after a POP isn't enough on a route whose
// real content (a fetched list, say) hasn't loaded yet at that exact
// moment — the page is still whatever shorter loading/skeleton state it
// starts in, so the browser clamps the scroll to that height, and nothing
// naturally re-applies the target once the content grows to its final
// height a moment later. Observing document.body for the whole retry
// window (rather than stopping early once it looks "settled") catches
// that growth reliably: content can genuinely grow in more than one step
// with a real gap in between (a fetch response landing, then a further
// layout pass — e.g. text re-wrapping once a web font finishes swapping
// in, which can arrive well after the data itself already rendered), so
// there's no safe, general "it's stopped changing" moment short of the
// hard cap to stop watching at. Returns a canceler so a navigation that
// interrupts this window can stop it rather than leaving it to fight the
// next page's own restore.
function restoreScrollY(targetY) {
  window.scrollTo(0, targetY)

  if (typeof ResizeObserver === 'undefined') {
    return () => {}
  }

  // Distinct from the hard cap firing — this specifically means a *newer*
  // navigation (or the user scrolling) has taken over, so this target no
  // longer applies to whatever page is now showing (guards the fonts.ready
  // callback below, which can otherwise fire well after this restore
  // attempt is moot).
  let isSuperseded = false

  const observer = new ResizeObserver(() => window.scrollTo(0, targetY))
  observer.observe(document.body)

  document.fonts?.ready?.then(() => {
    if (!isSuperseded) window.scrollTo(0, targetY)
  })

  const hardStop = setTimeout(disconnectAll, MAX_RETRY_WINDOW_MS)

  function disconnectAll() {
    isSuperseded = true
    clearTimeout(hardStop)
    observer.disconnect()
    for (const type of USER_SCROLL_EVENTS) window.removeEventListener(type, disconnectAll)
  }

  for (const type of USER_SCROLL_EVENTS) window.addEventListener(type, disconnectAll, { passive: true })

  return disconnectAll
}

// Positions are keyed by history-entry (`location.key`), not by pathname —
// visiting the same route twice (e.g. two different job listings, or the
// same listing revisited later) gets two independent entries and two
// independent remembered offsets, exactly like a normal multi-page site.
// Kept in a ref (in-memory only, not localStorage): this only needs to
// survive back/forward within the current tab's session, not a reload, so
// there's nothing to persist or ever evict.
export function useScrollRestoration() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const positions = useRef(new Map())
  const cancelPendingRestore = useRef(null)

  // The browser's own native scroll restoration runs on the same trigger
  // (popstate) and would otherwise race with this effect — sometimes
  // winning, sometimes losing, depending on the browser. Disabling it hands
  // scroll positioning to this hook exclusively, for every navigation type.
  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])

  useLayoutEffect(() => {
    // `positions` never gets reassigned (always the same Map for the
    // hook's lifetime) — copied to a plain variable here purely so the
    // cleanup below closes over that instead of `.current`, which is all
    // the linter needs to see this is safe.
    const positionsMap = positions.current

    // A navigation landing on a new route while an earlier one's retry
    // window is still open would otherwise have that stale observer keep
    // yanking scroll back toward the *previous* target underneath it.
    cancelPendingRestore.current?.()

    // No special-casing for the very first render: a POP with nothing
    // recorded yet for this key (true on the app's first-ever load) falls
    // back to 0 below anyway, which is exactly where a fresh load or hard
    // refresh belongs — and native scroll restoration is already disabled
    // (above), so there's no browser-driven placement here to avoid
    // fighting either. A ref-based "is this the first render" flag doesn't
    // survive React 18 StrictMode's mount→cleanup→mount-again dance
    // correctly (the cleanup already flips it before the second, real
    // invocation runs), which previously made that second invocation
    // misread its own dev-only phantom cleanup as a real prior visit.
    if (navigationType === 'POP') {
      // No recorded entry (a POP the app never actually visited, such as
      // a history entry from before the page was last loaded — or simply
      // the very first render) falls back to the top, same as PUSH.
      cancelPendingRestore.current = restoreScrollY(positionsMap.get(location.key) ?? 0)
    } else {
      window.scrollTo(0, 0)
    }

    // Captured on the way out (this cleanup fires right as the *next*
    // navigation's effect is about to run), not on the way in — recording
    // it now would only ever see 0, since we haven't scrolled this page yet.
    const key = location.key
    return () => {
      positionsMap.set(key, window.scrollY)
    }
  }, [location.key, navigationType])
}
