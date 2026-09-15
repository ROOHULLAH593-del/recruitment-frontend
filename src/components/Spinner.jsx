// Themed loading indicator — `currentColor` for both strokes means it
// always matches whatever text color the surrounding element already has
// (Button's `text-white`/`text-ink`/`text-rust` per variant, all of which
// are themselves driven by CSS custom properties), so it automatically
// tracks the active theme (and any custom palette override) with zero
// color logic of its own, rather than a hardcoded gray that would look
// bolted-on against every theme's actual palette.
export default function Spinner({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`inline-block shrink-0 animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
