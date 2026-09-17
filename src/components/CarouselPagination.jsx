import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

const TAP_SPRING = { type: 'spring', stiffness: 400, damping: 17 }

const ARROW_CLASSES =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40'

// Arrows + dots only — the sliding page content itself lives wherever this
// is rendered (JobsPage owns the fetch and the animated card grid), the same
// division of responsibility Pagination already has with the HR tables.
export default function CarouselPagination({ meta, onPageChange }) {
  if (!meta || meta.last_page <= 1) {
    return null
  }

  const { current_page: currentPage, last_page: lastPage } = meta
  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= lastPage

  return (
    <div className="mt-10 flex items-center justify-center gap-3 sm:gap-4">
      <motion.button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirstPage}
        whileHover={isFirstPage ? {} : { scale: 1.08 }}
        whileTap={isFirstPage ? {} : { scale: 0.92 }}
        transition={TAP_SPRING}
        aria-label="Previous page"
        className={ARROW_CLASSES}
      >
        <ChevronLeft size={18} />
      </motion.button>

      {/*
        A dot per page is the spec, but that can't assume they'll ever fit
        one row at any width or page count (32 pages of seeded data already
        overflows a phone screen) — scrolling this strip in its own bounded
        track keeps every dot reachable and keeps the arrows themselves from
        ever being pushed off-screen, instead of the whole layout stretching
        wider than the viewport. The scrollbar itself stays invisible at rest
        (scrollbar-hover-reveal, in index.css) so it doesn't compete with the
        dots for attention, fading in at the same thin/subtle weight as every
        other scrollbar in the app once the user actually hovers this area —
        the affordance that it scrolls is still there, just not shouted.
      */}
      <div className="scrollbar-hover-reveal flex max-w-[55vw] items-center gap-2 overflow-x-auto px-1 py-1 sm:max-w-xs">
        {Array.from({ length: lastPage }).map((_, index) => {
          const pageNumber = index + 1
          const isActive = pageNumber === currentPage

          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              aria-label={`Go to page ${pageNumber}`}
              aria-current={isActive ? 'page' : undefined}
              className={`h-2.5 shrink-0 rounded-full transition-all ${
                isActive ? 'w-6 bg-jade' : 'w-2.5 bg-ink/20 hover:bg-ink/35'
              }`}
            />
          )
        })}
      </div>

      <motion.button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLastPage}
        whileHover={isLastPage ? {} : { scale: 1.08 }}
        whileTap={isLastPage ? {} : { scale: 0.92 }}
        transition={TAP_SPRING}
        aria-label="Next page"
        className={ARROW_CLASSES}
      >
        <ChevronRight size={18} />
      </motion.button>
    </div>
  )
}
