import { AnimatePresence, motion } from 'framer-motion'
import { Building2, GalleryHorizontal, LayoutGrid, MapPin, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CarouselPagination from '../components/CarouselPagination'
import Pagination from '../components/Pagination'
import JobCardSkeleton from '../components/skeletons/JobCardSkeleton'
import api from '../lib/axios'
import { formatSalaryRange } from '../lib/format'

const MotionLink = motion.create(Link)

const CAROUSEL_PER_PAGE = 4
const GRID_PER_PAGE = 12

const VIEW_STORAGE_KEY = 'jobsViewMode'
const AVAILABLE_VIEWS = ['carousel', 'grid']
const DEFAULT_VIEW = 'carousel'

// Same read-with-validation-and-fallback shape as ThemeContext's own
// localStorage persistence — a stray/corrupted value degrades to the
// default view instead of breaking anything.
function readStoredViewMode() {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    return AVAILABLE_VIEWS.includes(stored) ? stored : DEFAULT_VIEW
  } catch {
    return DEFAULT_VIEW
  }
}

// Small enough offset to read as "sliding in from the side" without the
// cards traveling so far it feels like a different transition; paired with
// a fade so the direction is legible even at a glance. `custom` (the
// direction: 1 next / -1 previous) is threaded through by AnimatePresence
// into both variants, so the exiting page always leaves toward the side the
// new one entered from.
const SLIDE_VARIANTS = {
  enter: (direction) => ({ x: direction > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? -48 : 48, opacity: 0 }),
}

// Shared between both view modes so the two don't drift out of sync with
// each other's card markup — only how many of these render per page, and
// whether page changes animate, differs between carousel and grid.
function JobCard({ job }) {
  const salaryRange = formatSalaryRange(job.salary_min, job.salary_max)

  return (
    <MotionLink
      to={`/jobs/${job.id}`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className="block rounded-lg border border-card-ring bg-card-fill p-6 transition-colors hover:border-jade/50 hover:shadow-lg hover:shadow-card-shadow"
    >
      <h2 className="font-display text-xl text-ink">{job.title}</h2>
      {job.department && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/55">
          <Building2 size={14} />
          {job.department}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink/55">
        <span className="flex items-center gap-1.5">
          <MapPin size={14} />
          {job.location ?? 'Remote / Unspecified'}
        </span>
        {salaryRange && (
          <span className="flex items-center gap-1.5">
            <Wallet size={14} />
            {salaryRange}
          </span>
        )}
      </div>
    </MotionLink>
  )
}

const TOGGLE_BUTTON_BASE = 'flex h-9 w-9 items-center justify-center rounded-full transition-colors'

function ViewModeToggle({ viewMode, onChange }) {
  return (
    <div className="mt-6 flex justify-center">
      <div className="inline-flex items-center gap-1 rounded-full border border-ink/15 bg-card-fill p-1">
        <button
          type="button"
          onClick={() => onChange('carousel')}
          aria-label="Carousel view"
          aria-pressed={viewMode === 'carousel'}
          className={`${TOGGLE_BUTTON_BASE} ${
            viewMode === 'carousel' ? 'bg-jade-tint text-jade-deep' : 'text-ink/50 hover:text-ink'
          }`}
        >
          <GalleryHorizontal size={16} />
        </button>
        <button
          type="button"
          onClick={() => onChange('grid')}
          aria-label="Grid view"
          aria-pressed={viewMode === 'grid'}
          className={`${TOGGLE_BUTTON_BASE} ${
            viewMode === 'grid' ? 'bg-jade-tint text-jade-deep' : 'text-ink/50 hover:text-ink'
          }`}
        >
          <LayoutGrid size={16} />
        </button>
      </div>
    </div>
  )
}

export default function JobsPage() {
  const [viewMode, setViewMode] = useState(readStoredViewMode)
  const [jobs, setJobs] = useState([])
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(1)
  const [direction, setDirection] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, viewMode)
    } catch {
      // localStorage unavailable (private browsing, quota, etc.) — the
      // chosen view still applies this session, it just won't be remembered.
    }
  }, [viewMode])

  useEffect(() => {
    let isCancelled = false
    setIsLoading(true)

    const perPage = viewMode === 'carousel' ? CAROUSEL_PER_PAGE : GRID_PER_PAGE

    api
      .get('/jobs', { params: { page, per_page: perPage } })
      .then(({ data }) => {
        if (!isCancelled) {
          setJobs(data.data)
          setMeta(data.meta)
        }
      })
      .catch(() => {
        if (!isCancelled) setError('Unable to load job postings. Please try again later.')
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [page, viewMode])

  function goToPage(nextPage) {
    setDirection(nextPage > page ? 1 : -1)
    setPage(nextPage)
  }

  function changeViewMode(nextView) {
    if (nextView === viewMode) return
    // The two views paginate at different sizes (4 vs 12 per page), so a
    // page number from one has no sensible meaning in the other.
    setViewMode(nextView)
    setPage(1)
    setDirection(0)
  }

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-display text-4xl text-ink">Open positions</h1>
        <p className="mt-2 text-ink/50">Browse current openings below.</p>

        <ViewModeToggle viewMode={viewMode} onChange={changeViewMode} />

        {error && <p className="mt-10 text-rust">{error}</p>}

        {!isLoading && !error && jobs.length === 0 && (
          <p className="mt-10 text-ink/55">No open positions right now. Check back soon.</p>
        )}

        {viewMode === 'carousel' ? (
          <>
            <div className="mt-10 overflow-hidden">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={page}
                  custom={direction}
                  variants={SLIDE_VARIANTS}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
                  className="grid grid-cols-1 gap-5 sm:grid-cols-2"
                >
                  {isLoading
                    ? Array.from({ length: CAROUSEL_PER_PAGE }).map((_, index) => <JobCardSkeleton key={index} />)
                    : jobs.map((job) => <JobCard key={job.id} job={job} />)}
                </motion.div>
              </AnimatePresence>
            </div>

            <CarouselPagination meta={meta} onPageChange={goToPage} />
          </>
        ) : (
          <>
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading
                ? Array.from({ length: GRID_PER_PAGE }).map((_, index) => <JobCardSkeleton key={index} />)
                : jobs.map((job) => <JobCard key={job.id} job={job} />)}
            </div>

            <Pagination meta={meta} onPageChange={setPage} />
          </>
        )}
      </main>
    </div>
  )
}
