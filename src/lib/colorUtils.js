// Hex <-> HSL conversion plus the "deep"/"tint" shade-derivation formula the
// custom color picker uses. The formula's constants (0.72 lightness
// multiplier for "deep", a fixed ~90% lightness target for "tint") aren't
// arbitrary — they were reverse-engineered from the actual base/deep/tint
// triples already shipping across every preset theme's jade/amber/rust/
// violet (see the ratios documented inline below), so a user-picked color
// gets shades that read the same way the app's own designed palettes do.

// The only format every consumer below actually assumes (parseInt on fixed
// 2-char slices, template-literal CSS custom-property values) — a 6-digit
// hex triplet with a leading #. Used to reject malformed values before they
// reach setProperty or a localStorage round-trip, rather than letting them
// silently degrade into NaN-derived shades or an inert custom-property string.
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

export function isValidHexColor(value) {
  return typeof value === 'string' && HEX_COLOR_PATTERN.test(value)
}

export function hexToHsl(hex) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16) / 255
  const g = parseInt(normalized.slice(2, 4), 16) / 255
  const b = parseInt(normalized.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hueToRgb(p, q, tInput) {
  let t = tInput
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

export function hslToHex(hDeg, sPct, lPct) {
  const h = ((hDeg % 360) + 360) % 360 / 360
  const s = Math.max(0, Math.min(100, sPct)) / 100
  const l = Math.max(0, Math.min(100, lPct)) / 100

  let r
  let g
  let b
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hueToRgb(p, q, h + 1 / 3)
    g = hueToRgb(p, q, h)
    b = hueToRgb(p, q, h - 1 / 3)
  }

  const toHex = (channel) =>
    Math.round(channel * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Reference ratios, measured across the shipped themes' own base/deep/tint
// triples (e.g. warm's jade #C1622D / #8A3F1E / #F5E1D0): "deep" lands at
// roughly 70-80% of the base color's own lightness at the same hue/
// saturation, while "tint" lightness clusters tightly around 89-95%
// regardless of how light or dark the base color is — it's a target, not a
// relative offset. Saturation mostly stays close to the base for both deep
// and tint across those examples (a handful drift lower, none dramatically),
// so both shades keep the base saturation with only a slight tint reduction
// for a touch of softness, rather than washing it out.
const DEEP_LIGHTNESS_RATIO = 0.72
const DEEP_LIGHTNESS_MIN = 8
const TINT_LIGHTNESS = 90
const TINT_SATURATION_RATIO = 0.85
const TINT_SATURATION_MIN = 25

export function deriveShades(hex) {
  const { h, s, l } = hexToHsl(hex)
  const deepLightness = Math.max(DEEP_LIGHTNESS_MIN, l * DEEP_LIGHTNESS_RATIO)
  const tintSaturation = Math.max(TINT_SATURATION_MIN, s * TINT_SATURATION_RATIO)

  return {
    base: hex,
    deep: hslToHex(h, s, deepLightness),
    tint: hslToHex(h, tintSaturation, TINT_LIGHTNESS),
  }
}

// WCAG 2.x relative luminance / contrast ratio — the standard formula
// (linearize each sRGB channel, weight-sum, then compare the lighter and
// darker of two luminances). Used two ways here: `contrastRatio` for the
// picker's live Background/Text warning, and `readableTextColor` as a hard
// safety net so a custom-colored fill (a button, a status badge) can never
// end up with illegible text on top of it, regardless of what the user
// picks — text color isn't a matter of taste the way the fill color is.
function srgbChannelToLinear(channel) {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)

  return 0.2126 * srgbChannelToLinear(r) + 0.7152 * srgbChannelToLinear(g) + 0.0722 * srgbChannelToLinear(b)
}

// WCAG AA's normal-text threshold — used for the picker's Background/Text
// warning. Deliberately not the higher AAA bar (7:1): the picker warns,
// it doesn't block, so a threshold a determined user can reasonably ignore
// (rather than one so strict it nags on subtle-but-fine combinations) fits
// "informational only" better.
export const MIN_READABLE_CONTRAST = 4.5

export function contrastRatio(hexA, hexB) {
  const lA = relativeLuminance(hexA)
  const lB = relativeLuminance(hexB)
  const lighter = Math.max(lA, lB)
  const darker = Math.min(lA, lB)

  return (lighter + 0.05) / (darker + 0.05)
}

// Picks whichever of pure black/white contrasts more strongly against the
// given fill — more robust than a flat luminance cutoff (e.g. a saturated
// mid-tone can have middling luminance yet still contrast clearly better
// with one side than the other).
export function readableTextColor(backgroundHex) {
  const whiteContrast = contrastRatio(backgroundHex, '#ffffff')
  const blackContrast = contrastRatio(backgroundHex, '#000000')
  return whiteContrast >= blackContrast ? '#ffffff' : '#000000'
}
