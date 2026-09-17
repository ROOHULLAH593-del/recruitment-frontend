import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'

// 'md' fits a simple form or confirmation (ConfirmDialog, Schedule
// Interview); 'lg' matches SettingsPanel's own footprint for content that
// needs real room to breathe (skills, resume text, etc.).
const SIZE_CLASSES = {
  md: 'max-h-[85vh] max-w-md',
  lg: 'max-h-[min(640px,calc(100vh-4rem))] max-w-4xl',
}

export default function Modal({ title, onClose, children, size = 'md' }) {
  const overlayRef = useRef(null)
  const panelRef = useRef(null)

  // Modal is only ever rendered while conceptually "open" (callers mount it
  // conditionally), so this spans exactly its mounted lifetime — including
  // the exit animation below, since onClose (and the parent's unmount) only
  // fires once that finishes.
  useBodyScrollLock(true)

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
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-6">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full overflow-y-auto rounded-lg border border-ink/10 bg-surface-elevated p-6 ${SIZE_CLASSES[size]}`}
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
