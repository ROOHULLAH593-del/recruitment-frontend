import { motion } from 'framer-motion'

export default function SkeletonBlock({ className = '' }) {
  return (
    <motion.div
      className={`rounded bg-ink/5 ${className}`}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}
