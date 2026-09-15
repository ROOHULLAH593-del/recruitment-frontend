import { motion } from 'framer-motion'
import { Building2, Gauge, MapPinned, ShieldCheck, UserCog, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Button from '../components/Button'
import StatCard from '../components/StatCard'
import StatCardSkeleton from '../components/skeletons/StatCardSkeleton'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/axios'

const WHY_CARDS = [
  {
    icon: Gauge,
    title: 'Built for BPO volume',
    description: 'Pagination, filtering, and status pipelines designed to stay fast at hundreds of applications per role.',
  },
  {
    icon: UserCog,
    title: 'A clear pipeline for every application',
    description: 'From applied to hired, every status change is tracked, auditable, and visible to the people who need it.',
  },
  {
    icon: ShieldCheck,
    title: 'One system, two experiences',
    description: 'A calm, scannable workspace for HR managing the pipeline, and a simple, welcoming board for candidates browsing roles.',
  },
]

export default function LandingPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let isCancelled = false

    api
      .get('/jobs', { params: { per_page: 100 } })
      .then(({ data }) => {
        if (isCancelled) return
        const jobs = data.data
        const departments = new Set(jobs.map((job) => job.department).filter(Boolean))
        const locations = new Set(jobs.map((job) => job.location).filter(Boolean))
        setStats({
          openRoles: data.meta.total,
          departments: departments.size,
          locations: locations.size,
        })
      })
      .catch(() => {
        if (!isCancelled) setStats({ openRoles: 0, departments: 0, locations: 0 })
      })

    return () => {
      isCancelled = true
    }
  }, [])

  if (!isLoading && isAuthenticated) {
    const destination = user?.role === 'candidate' ? '/dashboard' : '/hr/dashboard'
    return <Navigate to={destination} replace />
  }

  return (
    <div className="min-h-screen bg-canvas">
      <section className="mx-auto max-w-5xl px-6 py-20 text-center sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
            Hiring at BPO scale, <span className="text-ink/50">without losing track of a single candidate.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink/55">
            A recruitment workspace built for high-volume BPO hiring — a clear pipeline for HR, a simple path for
            candidates, and nothing that gets lost in between.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/jobs">
              <Button variant="primary" className="px-6 py-3 text-base">
                Browse open roles
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="border-t border-ink/10 bg-surface-muted px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats ? (
              <>
                <StatCard label="Open roles" value={stats.openRoles} delay={0} />
                <StatCard label="Departments hiring" value={stats.departments} delay={0.12} />
                <StatCard label="Locations" value={stats.locations} delay={0.24} />
              </>
            ) : (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="font-display text-3xl text-ink">Why this platform</h2>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {WHY_CARDS.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.12, ease: 'easeOut' }}
                className="rounded-lg border border-card-ring bg-card-fill p-8"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-jade-tint text-jade-deep">
                  <card.icon size={22} />
                </div>
                <h3 className="mt-6 text-lg font-semibold text-ink">{card.title}</h3>
                <p className="mt-2 text-sm text-ink/55">{card.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-ink/10 px-6 py-16 text-center">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 text-ink/55">
          <div className="flex items-center gap-2">
            <Users size={16} />
            <Building2 size={16} />
            <MapPinned size={16} />
          </div>
          <p className="text-sm">Candidates and HR teams, one shared pipeline.</p>
        </div>
      </section>
    </div>
  )
}
