import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export default function StatCard({ label, value, delay = 0 }) {
  const valueRef = useRef(null)

  useEffect(() => {
    const el = valueRef.current
    if (!el) return

    const target = Number(value) || 0
    const counter = { current: 0 }

    const tween = gsap.to(counter, {
      current: target,
      duration: 1,
      delay,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = Math.round(counter.current).toLocaleString()
      },
    })

    return () => tween.kill()
  }, [value, delay])

  return (
    // `card-ring`/`card-shadow`/`card-fill` (not `ink/10`/`canvas`) so a theme
    // can give this real visual presence — see index.css for why the plain
    // hairline wasn't enough. "warm" and "bold" are the two themes where this
    // now visibly differs from a plain `bg-canvas` hairline card.
    <div className="rounded-lg border border-card-ring bg-card-fill p-6 shadow-lg shadow-card-shadow">
      <p className="text-sm text-ink/55">{label}</p>
      <p ref={valueRef} className="mt-2 font-display text-4xl text-ink">
        0
      </p>
    </div>
  )
}
