import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export default function StatusBadge({ status, theme }) {
  const ref = useRef(null)
  const previousStatus = useRef(status)
  const entry = theme[status]
  const isOutline = theme.badgeStyle === 'outline'

  useEffect(() => {
    const el = ref.current
    if (!el || !entry) return

    // Both branches set every property GSAP might have previously touched
    // (border included) so switching themes on an already-mounted badge
    // (e.g. the style-preview's toggle) can't leave a stale inline style
    // from the other mode behind — filled mode explicitly zeroes the border
    // rather than just omitting it.
    const target = isOutline
      ? { backgroundColor: 'transparent', color: entry.text, borderWidth: 1.5, borderStyle: 'solid', borderColor: entry.text }
      : { backgroundColor: entry.bg, color: entry.text, borderWidth: 0, borderColor: 'transparent' }

    if (previousStatus.current === status) {
      gsap.set(el, target)
    } else {
      gsap.to(el, { ...target, duration: 0.45, ease: 'power2.out' })
      previousStatus.current = status
    }
  }, [status, entry, isOutline])

  return (
    <span
      ref={ref}
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
    >
      {entry?.label ?? status}
    </span>
  )
}
