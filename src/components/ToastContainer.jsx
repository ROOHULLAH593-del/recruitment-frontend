import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useThemeColors } from '../hooks/useThemeColors'

const ICONS = { positive: CheckCircle2, caution: AlertTriangle, negative: XCircle, info: Info }
const STATUS_VARIANTS = ['positive', 'caution', 'negative']

// Colored via the same positive/caution/negative palette roles StatusBadge
// already uses (not a separate ad-hoc color choice), including respecting
// "outline" vs "filled" badgeStyle per theme — dark theme's toasts read as
// clean outlined chips instead of filled-pastel stickers, same reasoning as
// the status badges themselves. "info" isn't one of those three roles, so it
// stays a plain neutral surface via ordinary Tailwind classes.
function ToastItem({ toast, onDismiss, palette, isOutline }) {
  const Icon = ICONS[toast.variant] ?? Info
  const isStatusVariant = STATUS_VARIANTS.includes(toast.variant)

  const dynamicStyle = isStatusVariant
    ? isOutline
      ? { backgroundColor: 'var(--color-canvas)', borderColor: palette[toast.variant], color: palette[toast.variant] }
      : { backgroundColor: palette[`${toast.variant}Tint`], borderColor: 'transparent', color: palette[`${toast.variant}Deep`] }
    : undefined

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      role="status"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg sm:w-96 ${
        isStatusVariant ? '' : 'border-ink/10 bg-surface-muted text-ink'
      }`}
      style={dynamicStyle}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 opacity-60 hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </motion.div>
  )
}

export default function ToastContainer({ toasts, onDismiss }) {
  const { palette, badgeStyle } = useThemeColors()

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => onDismiss(toast.id)}
            palette={palette}
            isOutline={badgeStyle === 'outline'}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
