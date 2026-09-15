import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export default function Modal({ title, onClose, children }) {
  const overlayRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    gsap.set(overlayRef.current, { opacity: 0 })
    gsap.set(panelRef.current, { opacity: 0, y: 12, scale: 0.97 })
    gsap.to(overlayRef.current, { opacity: 1, duration: 0.2, ease: 'power1.out' })
    gsap.to(panelRef.current, { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: 'power2.out', delay: 0.02 })
  }, [])

  function animatedClose() {
    gsap.to(panelRef.current, { opacity: 0, y: 8, scale: 0.97, duration: 0.18, ease: 'power1.in' })
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.18, delay: 0.02, onComplete: onClose })
  }

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-lg border border-ink/10 bg-surface-elevated p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">{title}</h2>
          <button
            type="button"
            onClick={animatedClose}
            className="text-ink/40 hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">{typeof children === 'function' ? children(animatedClose) : children}</div>
      </div>
    </div>
  )
}
