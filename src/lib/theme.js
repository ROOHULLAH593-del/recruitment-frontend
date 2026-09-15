import { deriveShades, readableTextColor } from './colorUtils'

// Per-theme raw color data. Mirrors the CSS custom properties in index.css,
// kept as real hex values (rather than CSS variables) because GSAP needs
// concrete colors to tween between, not var() references. Adding theme #3
// means adding one more entry here — nothing else in this file changes.
//
// "positive/caution/negative" are semantic status roles, kept independent of
// whatever a theme's brand/accent color is doing elsewhere (e.g. the "warm"
// theme's brand accent is plum, but its positive-status color is sage — the
// two are unrelated and shouldn't be forced to share one hue just because
// the "default" theme's brand accent and positive-status happened to be the
// same color, jade).
//
// Exported (not just used internally) because the custom color picker's
// "start from this theme" step and its live palette merge (see
// buildCustomThemeColors below) both need the same raw per-theme values this
// file already treats as canonical — re-deriving them elsewhere would be a
// second source of truth to keep in sync by hand.
export const THEME_PALETTES = {
  default: {
    ink: '#16181D',
    positive: '#0F6E5C',
    positiveDeep: '#0B5245',
    positiveTint: '#E1EFEA',
    caution: '#B8842C',
    cautionDeep: '#7C5519',
    cautionTint: '#F6E8D2',
    negative: '#A8412F',
    negativeDeep: '#832F21',
    negativeTint: '#F2DEDA',
    badgeStyle: 'filled',
  },
  warm: {
    // Kept in sync with index.css's [data-theme="warm"] --color-ink by hand
    // (this file predates that token and GSAP needs a real hex, not a CSS
    // var) — was missed when the "Warm Premium" pass refined --color-ink
    // from #2B2620 to this espresso tone; only affects the neutral
    // ink-based "Applied"/"Draft" badge fill under warm, but real drift is
    // real drift.
    ink: '#3A2E24',
    positive: '#6B8566', // sage
    positiveDeep: '#4A5F46',
    positiveTint: '#E7EDE3',
    caution: '#B98A3E', // honey
    cautionDeep: '#8F692C',
    cautionTint: '#F5EAD3',
    negative: '#B0674C', // clay
    negativeDeep: '#844B37',
    negativeTint: '#F3E0D7',
    badgeStyle: 'filled',
  },
  dark: {
    ink: '#F0F2F5',
    positive: '#4ABE7E', // emerald
    positiveDeep: '#1F7A4D',
    positiveTint: '#DFF3E7',
    caution: '#D9A441', // amber
    cautionDeep: '#8A621F',
    cautionTint: '#F7ECD3',
    negative: '#E5695A', // coral
    negativeDeep: '#9C3F31',
    negativeTint: '#F8DEDA',
    // Filled pastel-tint pills read as stickers against a near-black canvas
    // (their tints were calibrated for contrast against a light bg). Outline
    // badges use the same data shape (bg/text/label) but with a transparent
    // fill and the status's own accent color for both border and text.
    badgeStyle: 'outline',
  },
  bold: {
    ink: '#2D2A3D',
    positive: '#22C55E', // vivid green
    positiveDeep: '#15803D',
    positiveTint: '#DCFCE7',
    caution: '#F59E0B', // vivid amber
    cautionDeep: '#B45309',
    cautionTint: '#FEF3C7',
    negative: '#F43F5E', // vivid rose
    negativeDeep: '#BE123C',
    negativeTint: '#FFE4E8',
    badgeStyle: 'filled',
  },
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function buildThemeColors(palette) {
  const { ink, positive, positiveDeep, positiveTint, caution, cautionDeep, cautionTint, negative, negativeDeep, negativeTint } =
    palette
  const badgeStyle = palette.badgeStyle ?? 'filled'
  const isOutline = badgeStyle === 'outline'

  // Outline badges reuse the same {bg, text, label} shape as filled ones —
  // StatusBadge doesn't need a schema change, just a transparent bg and an
  // accent color for `text` (which it also uses as the border color). The
  // accent passed in here is deliberately the *base* role hue (`positive`/
  // `caution`/`negative`), not the "Deep" variant filled mode uses for text:
  // Deep hues were calibrated for contrast against a light pastel tint, and
  // read poorly as a border/text directly against a near-black canvas.
  //
  // `hired`/`completed` below pass `readableTextColor(positiveDeep)` rather
  // than a literal white — every preset's positiveDeep is dark enough that
  // this still resolves to white (verified), so presets render pixel-
  // identical, but a custom "Success" pick light enough to make white
  // illegible now correctly gets black text instead. Text color on a solid
  // fill is a legibility requirement, not a stylistic choice, so this is a
  // hard rule rather than something the color picker can override.
  function entry(filledBg, filledText, outlineAccent, label) {
    return isOutline ? { bg: 'transparent', text: outlineAccent, label } : { bg: filledBg, text: filledText, label }
  }

  const applicationStatusTheme = {
    applied: entry(hexToRgba(ink, 0.06), hexToRgba(ink, 0.65), hexToRgba(ink, 0.65), 'Applied'),
    shortlisted: entry(cautionTint, cautionDeep, caution, 'Shortlisted'),
    interview_scheduled: entry(positiveTint, positive, positive, 'Interview scheduled'),
    interviewed: entry(positiveTint, positiveDeep, positive, 'Interviewed'),
    offered: entry(cautionTint, cautionDeep, caution, 'Offered'),
    hired: entry(positiveDeep, readableTextColor(positiveDeep), positive, 'Hired'),
    rejected: entry(negativeTint, negativeDeep, negative, 'Rejected'),
  }

  const interviewStatusTheme = {
    scheduled: entry(positiveTint, positive, positive, 'Scheduled'),
    completed: entry(positiveDeep, readableTextColor(positiveDeep), positive, 'Completed'),
    cancelled: entry(negativeTint, negativeDeep, negative, 'Cancelled'),
    rescheduled: entry(cautionTint, cautionDeep, caution, 'Rescheduled'),
  }

  const jobStatusTheme = {
    draft: entry(hexToRgba(ink, 0.06), hexToRgba(ink, 0.65), hexToRgba(ink, 0.65), 'Draft'),
    open: entry(positiveTint, positiveDeep, positive, 'Open'),
    closed: entry(negativeTint, negativeDeep, negative, 'Closed'),
  }

  // Non-enumerable so `Object.keys(applicationStatusTheme)` (used to iterate
  // "all statuses" for swatches, e.g. in the style preview) still sees only
  // real status keys — StatusBadge reads `theme.badgeStyle` directly off
  // whichever status-theme object it was handed.
  for (const statusTheme of [applicationStatusTheme, interviewStatusTheme, jobStatusTheme]) {
    Object.defineProperty(statusTheme, 'badgeStyle', { value: badgeStyle, enumerable: false })
  }

  // Small colored pill for an important number embedded in a dense list (e.g.
  // match score), colored by range rather than shown as an oversized numeral.
  // Follows the same badgeStyle as status badges now (outline under "dark",
  // filled everywhere else) for visual consistency — `border` is undefined
  // in filled mode, so spreading it into an inline style is a no-op there.
  function scoreChip(score) {
    const tier = score >= 70 ? { tint: positiveTint, deep: positiveDeep, base: positive }
      : score >= 40 ? { tint: cautionTint, deep: cautionDeep, base: caution }
      : { tint: negativeTint, deep: negativeDeep, base: negative }

    return isOutline
      ? { bg: 'transparent', text: tier.base, border: tier.base }
      : { bg: tier.tint, text: tier.deep, border: undefined }
  }

  return { palette, badgeStyle, applicationStatusTheme, interviewStatusTheme, jobStatusTheme, scoreChip }
}

const THEME_COLORS = Object.fromEntries(
  Object.entries(THEME_PALETTES).map(([name, palette]) => [name, buildThemeColors(palette)]),
)

// Pure lookup, usable outside React too — the useThemeColors hook is a thin
// wrapper around this that resolves `theme` from context.
export function getThemeColors(themeName) {
  return THEME_COLORS[themeName] ?? THEME_COLORS.default
}

// The custom color picker's live-applying counterpart to getThemeColors:
// starts from a base theme's full palette (so anything the picker doesn't
// expose as a role — badgeStyle, for instance — still comes from somewhere
// sensible) and overrides exactly the four fields the picker's 7 roles
// actually map onto here (the other 3 roles — background/primary/secondary —
// are pure CSS-token surfaces with no JS/GSAP consumer, so they're applied
// separately as runtime custom-property overrides; see lib/customPalette.js).
// "Success"/"caution"/"danger" each go through the same deriveShades formula
// the CSS-side roles use, so a status badge's tint/deep relationship reads
// the same way a customized button's does.
export function buildCustomThemeColors(baseThemeName, customColors) {
  const basePalette = THEME_PALETTES[baseThemeName] ?? THEME_PALETTES.default
  const success = deriveShades(customColors.success)
  const caution = deriveShades(customColors.caution)
  const danger = deriveShades(customColors.danger)

  return buildThemeColors({
    ...basePalette,
    ink: customColors.text,
    positive: success.base,
    positiveDeep: success.deep,
    positiveTint: success.tint,
    caution: caution.base,
    cautionDeep: caution.deep,
    cautionTint: caution.tint,
    negative: danger.base,
    negativeDeep: danger.deep,
    negativeTint: danger.tint,
  })
}
