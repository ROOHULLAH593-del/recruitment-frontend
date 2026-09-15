import { useCallback, useEffect, useState } from 'react'

// Tracks whether a horizontally-scrollable element currently has more
// content hidden off-screen to the left/right, so a sticky column's edge
// shadow can appear only when there's actually something to scroll to in
// that direction — not as a static decoration shown regardless of position.
export function useScrollShadow(ref) {
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return

    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [ref])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    update()
    el.addEventListener('scroll', update, { passive: true })

    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(el)

    return () => {
      el.removeEventListener('scroll', update)
      resizeObserver.disconnect()
    }
  }, [ref, update])

  return { canScrollLeft, canScrollRight }
}
