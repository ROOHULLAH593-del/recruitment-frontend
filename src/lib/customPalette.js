import { deriveShades, readableTextColor } from './colorUtils'
import { THEME_PALETTES } from './theme'

export const CUSTOM_PALETTE_STORAGE_KEY = 'customPalette'

export const CUSTOMIZABLE_ROLES = [
  { key: 'background', label: 'Background' },
  { key: 'text', label: 'Text' },
  { key: 'primary', label: 'Primary accent' },
  { key: 'secondary', label: 'Secondary accent' },
  { key: 'success', label: 'Success' },
  { key: 'caution', label: 'Caution' },
  { key: 'danger', label: 'Danger' },
]

// Roles that map onto exactly one CSS custom property, with no derived
// shades — a page background or body text doesn't have a natural "deep"/
// "tint" pair the way an accent color does (opacity-based usage like
// `text-ink/55` already adapts automatically once `--color-ink` changes).
const SINGLE_TOKEN_ROLES = { background: '--color-canvas', text: '--color-ink' }

// Roles that map onto a base/deep/tint CSS custom property triplet, applied
// via lib/colorUtils.deriveShades. "success" is deliberately absent here —
// unlike caution/danger, nothing in the app renders a `bg-success`-style
// Tailwind utility today (status badges are GSAP/inline-style driven, not
// CSS-var driven), so its only live effect is through the JS-side palette
// merge in lib/theme.js's buildCustomThemeColors, not a CSS override.
const SHADE_TOKEN_ROLES = {
  primary: '--color-jade',
  secondary: '--color-violet',
  caution: '--color-amber',
  danger: '--color-rust',
}

// `--color-on-jade` is the hard safety net for the few spots that render a
// literal `bg-jade` solid fill with hardcoded white text (the Header
// register CTA, the avatar circle) — every real usage reads it as
// `var(--color-on-jade,_white)`, so leaving it unset (every preset theme,
// and "primary" whenever it isn't customized) is exactly equivalent to the
// literal `white` those spots used before this existed. It's only ever
// *set* here, computed from the actual picked primary color, so it's a
// pure custom-palette concern with zero footprint on presets.
const ON_FILL_CSS_VAR = '--color-on-jade'

// Applies the custom palette as inline styles on <html> — these win over
// any `[data-theme="x"]` attribute-selector rule on specificity alone, so
// the override sits cleanly "on top of the active theme" without needing
// !important or touching the data-theme attribute itself.
export function applyCustomPaletteCss(colors) {
  const root = document.documentElement.style

  for (const [role, cssVar] of Object.entries(SINGLE_TOKEN_ROLES)) {
    if (colors[role]) root.setProperty(cssVar, colors[role])
  }

  for (const [role, cssVar] of Object.entries(SHADE_TOKEN_ROLES)) {
    if (!colors[role]) continue
    const { base, deep, tint } = deriveShades(colors[role])
    root.setProperty(cssVar, base)
    root.setProperty(`${cssVar}-deep`, deep)
    root.setProperty(`${cssVar}-tint`, tint)
  }

  if (colors.primary) root.setProperty(ON_FILL_CSS_VAR, readableTextColor(colors.primary))
}

// Removes every inline override this module could have set, letting the
// active `[data-theme="x"]` block's own values show through again.
export function clearCustomPaletteCss() {
  const root = document.documentElement.style

  for (const cssVar of Object.values(SINGLE_TOKEN_ROLES)) root.removeProperty(cssVar)

  for (const cssVar of Object.values(SHADE_TOKEN_ROLES)) {
    root.removeProperty(cssVar)
    root.removeProperty(`${cssVar}-deep`)
    root.removeProperty(`${cssVar}-tint`)
  }

  root.removeProperty(ON_FILL_CSS_VAR)
}

const PROBED_CSS_VARS = ['--color-canvas', '--color-jade', '--color-violet', '--color-amber']

// Reads a theme's actual computed CSS custom properties rather than
// hardcoding a parallel table of hex values here — the same reasoning
// ThemePicker's own swatches already follow ("always exactly what that
// theme actually renders, with nothing to keep in sync by hand"). Briefly
// swaps <html>'s data-theme to the target theme, reads, then restores
// whatever it was — synchronous, so nothing paints in between.
//
// If the custom palette is currently active, though, its own overrides are
// *inline* styles on this same element — higher specificity than any
// `[data-theme]` rule, so they'd keep showing through regardless of what
// the attribute says, and every "start from" / "reset" call would just read
// back today's already-applied override instead of the target theme's real
// value (this is exactly what broke "reset to default" for CSS-sourced
// roles before this fix). Clearing those specific inline properties first,
// then restoring them exactly afterward, makes the probe see the same
// thing it would if no override existed yet.
function getThemeCssValues(themeName) {
  const root = document.documentElement
  const previousTheme = root.getAttribute('data-theme')
  const previousInlineValues = PROBED_CSS_VARS.map((cssVar) => root.style.getPropertyValue(cssVar))

  PROBED_CSS_VARS.forEach((cssVar) => root.style.removeProperty(cssVar))
  root.setAttribute('data-theme', themeName)

  const computed = getComputedStyle(root)
  const values = {
    background: computed.getPropertyValue('--color-canvas').trim(),
    primary: computed.getPropertyValue('--color-jade').trim(),
    secondary: computed.getPropertyValue('--color-violet').trim(),
    caution: computed.getPropertyValue('--color-amber').trim(),
  }

  if (previousTheme === null) root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', previousTheme)

  PROBED_CSS_VARS.forEach((cssVar, index) => {
    if (previousInlineValues[index]) root.style.setProperty(cssVar, previousInlineValues[index])
  })

  return values
}

// The picker's "start from" pre-fill: all 7 roles' current values for a
// given preset theme. CSS-only roles (background/primary/secondary/caution)
// come from computed styles; the remaining roles (text/success/danger) come
// from THEME_PALETTES since that's their only source (see lib/theme.js).
export function getThemeBaseColors(themeName) {
  const css = getThemeCssValues(themeName)
  const palette = THEME_PALETTES[themeName] ?? THEME_PALETTES.default

  return {
    background: css.background,
    text: palette.ink,
    primary: css.primary,
    secondary: css.secondary,
    success: palette.positive,
    caution: css.caution,
    danger: palette.negative,
  }
}
