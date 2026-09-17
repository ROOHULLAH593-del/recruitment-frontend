import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'

// Same threshold shape as Header's own isScrolled check (window.scrollY > 20)
// — just a taller bar, since this button appearing is a bigger visual change
// than the header's subtle pill treatment and shouldn't fire the moment the
// page nudges past the fold.
const SHOW_AFTER_PX = 320

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > SHOW_AFTER_PX)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          // No whileHover/whileTap scale here — same call as Button.jsx's
          // primary variant (this reuses its exact bg-emphasis/glow
          // treatment): the CSS color/glow transition below is already
          // sufficient feedback.
          //
          // z-40: above ordinary page content and level with the sticky
          // header, but below modals/the mobile nav drawer/toasts (all z-50+)
          // so an open overlay's own backdrop still covers this rather than
          // leaving it floating on top of one.
          className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-emphasis text-white shadow-lg shadow-ink/20 transition-colors hover:bg-emphasis/85 hover:shadow-[var(--shadow-glow)] focus-visible:shadow-[var(--shadow-glow)]"
        >
          <ArrowUp size={20} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
