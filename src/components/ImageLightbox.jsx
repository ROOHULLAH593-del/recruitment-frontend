import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'

// Full-screen image viewer for a single document, following the same
// Framer Motion overlay pattern as SettingsPanel — a separate backdrop
// motion.div and a centered panel motion.div, so a backdrop click and a
// click on the image itself never fight over the same element (no
// stopPropagation needed).
export default function ImageLightbox({ isOpen, src, onClose }) {
  const [isZoomed, setIsZoomed] = useState(false)
  const [lastSrc, setLastSrc] = useState(src)

  // Reset zoom each time a new image is opened, not just on close, so a
  // previous document's zoom state can't leak into the next one. Adjusted
  // during render (React's sanctioned pattern for "reset state when a prop
  // changes", same technique SettingsPanel uses for its active tab) rather
  // than in an effect, so this can't cascade renders.
  if (src !== lastSrc) {
    setLastSrc(src)
    setIsZoomed(false)
  }

  useBodyScrollLock(isOpen)

  useEffect(() => {
    if (!isOpen) return

    function handleEscape(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)

    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-ink/60 backdrop-blur-md"
          />

          <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-10">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="pointer-events-auto fixed right-4 top-4 z-[71] flex h-10 w-10 items-center justify-center rounded-full bg-ink/70 text-white hover:bg-ink/90"
            >
              <X size={18} />
            </button>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="pointer-events-auto max-h-full max-w-full overflow-auto rounded-lg"
            >
              {src && (
                <img
                  src={src}
                  alt="Document preview"
                  onClick={() => setIsZoomed((previous) => !previous)}
                  className={
                    isZoomed
                      ? 'block w-[160vw] max-w-none cursor-zoom-out sm:w-[120vw]'
                      : 'block max-h-[85vh] max-w-[90vw] cursor-zoom-in object-contain'
                  }
                />
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
