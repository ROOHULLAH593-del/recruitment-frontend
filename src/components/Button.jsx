import { motion } from 'framer-motion'
import { forwardRef } from 'react'
import Spinner from './Spinner'

const VARIANTS = {
  // `emphasis` (not `ink`) so this stays a solid dark surface even in themes
  // where `ink` itself is light (i.e. dark-canvas themes, where `ink` is the
  // body text color and must be light for that to work) — see index.css.
  // `shadow-[var(--shadow-glow)]` is a no-op box-shadow in every theme except
  // "dark" (see index.css), where it's a soft cyan glow gated to hover/focus
  // only — never present at rest, so a resting screen of primary buttons
  // stays as calm as it is today.
  primary:
    'bg-emphasis text-white hover:bg-emphasis/85 disabled:bg-emphasis/8 disabled:text-ink/35 hover:shadow-[var(--shadow-glow)] focus-visible:shadow-[var(--shadow-glow)]',
  secondary: 'border border-ink/15 text-ink hover:bg-ink/5 disabled:border-ink/10 disabled:text-ink/35',
  ghost: 'text-ink hover:bg-ink/5 disabled:text-ink/35',
  destructive: 'border border-rust/30 text-rust hover:bg-rust-tint disabled:border-ink/10 disabled:text-ink/35',
}

// Primary buttons already get sufficient feedback from their CSS color transition;
// tactile scale feedback is reserved for secondary/ghost/destructive actions.
const TAP_SPRING = { type: 'spring', stiffness: 400, damping: 17 }

const Button = forwardRef(function Button(
  { variant = 'primary', icon: Icon, iconPosition = 'left', loading = false, className = '', children, disabled, ...props },
  ref,
) {
  // `loading` implies disabled regardless of what the caller passed — the
  // whole point is making a double-click impossible while a request for
  // this exact action is already in flight.
  const isDisabled = disabled || loading
  const motionProps =
    variant !== 'primary' && !isDisabled
      ? { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 }, transition: TAP_SPRING }
      : {}

  return (
    <motion.button
      ref={ref}
      disabled={isDisabled}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium font-sans transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...motionProps}
      {...props}
    >
      {/* The spinner takes the icon's slot (always on the left, regardless
          of `iconPosition` — a loading indicator conventionally leads)
          rather than replacing `children`, so callers keep full control of
          the label text (many already swap it to "Saving…" themselves)
          and the button doesn't change width just because it started
          loading. */}
      {loading ? <Spinner size={16} /> : Icon && iconPosition === 'left' && <Icon size={16} />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={16} />}
    </motion.button>
  )
})

export default Button
