import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useCustomPalette } from '../hooks/useCustomPalette'
import { contrastRatio, MIN_READABLE_CONTRAST, readableTextColor } from '../lib/colorUtils'
import { CUSTOMIZABLE_ROLES } from '../lib/customPalette'
import { buildCustomThemeColors } from '../lib/theme'
import Button from './Button'
import Select from './Select'
import StatusBadge from './StatusBadge'

const BASE_THEME_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'warm', label: 'Warm' },
  { value: 'dark', label: 'Dark' },
  { value: 'bold', label: 'Bold' },
]

const SELECT_CLASSES =
  'mt-1 block w-full max-w-xs rounded-md border border-ink/15 bg-card-fill px-3 py-2 text-left text-sm text-ink focus:border-jade focus:outline-none focus:ring-1 focus:ring-jade'

// The native color input is still the actual picker (no wheel/canvas to
// build) — this class list just strips its default browser chrome down to
// a plain, borderless swatch so it reads as one of the app's own controls
// rather than raw OS UI. `[&::-webkit-color-swatch*]` targets are Chromium/
// Safari-specific pseudo-elements; Firefox's native swatch already fills
// its box edge-to-edge without them.
const SWATCH_CLASSES =
  'h-9 w-9 shrink-0 cursor-pointer appearance-none rounded-md border border-ink/15 bg-transparent p-0 ' +
  '[&::-webkit-color-swatch]:rounded-[5px] [&::-webkit-color-swatch]:border-none ' +
  '[&::-webkit-color-swatch-wrapper]:rounded-md [&::-webkit-color-swatch-wrapper]:p-0.5'

export default function ColorCustomizer() {
  const { customPalette, setBaseTheme, setColor, resetColor, resetAll, setActive } = useCustomPalette()
  const { colors, baseTheme, isActive } = customPalette

  const contrast = contrastRatio(colors.background, colors.text)
  const isLowContrast = contrast < MIN_READABLE_CONTRAST

  // Reuses the exact function that would actually build the live status-
  // badge palette if this were applied for real, so the preview badges
  // below aren't a lookalike — they're the real thing (outline vs filled
  // included, via `.badgeStyle` on the returned object), just fed draft
  // colors instead of the committed ones.
  const previewThemeColors = buildCustomThemeColors(baseTheme, colors)
  const primaryTextColor = readableTextColor(colors.primary)

  return (
    <div className="mt-8 border-t border-ink/10 pt-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-base text-ink">Customize</p>
          <p className="mt-1 text-xs text-ink/55">
            Pick your own colors for each role. Applies immediately across the whole app.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setActive(event.target.checked)}
            className="h-4 w-4 accent-jade"
          />
          {isActive ? 'On' : 'Off'}
        </label>
      </div>

      <div className="mt-4">
        <label htmlFor="custom-base-theme" className="block text-xs font-medium text-ink/55">
          Start from
        </label>
        <Select
          id="custom-base-theme"
          name="baseTheme"
          value={baseTheme}
          onChange={(event) => setBaseTheme(event.target.value)}
          options={BASE_THEME_OPTIONS}
          className={SELECT_CLASSES}
        />
        <p className="mt-1 text-xs text-ink/40">Re-fills every role below from that theme's current colors.</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CUSTOMIZABLE_ROLES.map((role) => (
          <div
            key={role.key}
            className="flex items-center gap-3 rounded-md border border-ink/10 bg-card-fill px-3 py-2"
          >
            <input
              type="color"
              value={colors[role.key] ?? '#000000'}
              onChange={(event) => setColor(role.key, event.target.value)}
              aria-label={`${role.label} color`}
              className={SWATCH_CLASSES}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">{role.label}</p>
              <p className="truncate font-mono text-xs uppercase text-ink/50">{colors[role.key]}</p>
            </div>
            <button
              type="button"
              onClick={() => resetColor(role.key)}
              aria-label={`Reset ${role.label} to theme default`}
              className="shrink-0 text-ink/40 hover:text-ink"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        ))}
      </div>

      {isLowContrast && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-rust">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          Background and Text may be hard to read together (contrast {contrast.toFixed(1)}:1 — {MIN_READABLE_CONTRAST}:1
          recommended). This won't stop you from applying it.
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" icon={RotateCcw} onClick={resetAll}>
          Reset all
        </Button>
      </div>

      <div className="mt-6 rounded-lg border border-ink/10 bg-card-fill p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink/50">Preview</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            style={{ backgroundColor: colors.primary, color: primaryTextColor }}
            className="rounded-md px-4 py-2 text-sm font-medium"
          >
            Primary button
          </button>
          <StatusBadge status="hired" theme={previewThemeColors.applicationStatusTheme} />
          <StatusBadge status="shortlisted" theme={previewThemeColors.applicationStatusTheme} />
          <StatusBadge status="rejected" theme={previewThemeColors.applicationStatusTheme} />
        </div>

        <p
          className="mt-3 rounded-md px-3 py-2 text-sm"
          style={{ backgroundColor: colors.background, color: colors.text }}
        >
          Sample text on your chosen background.
        </p>
      </div>
    </div>
  )
}
