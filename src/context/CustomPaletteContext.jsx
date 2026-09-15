import { useCallback, useEffect, useState } from 'react'
import { applyCustomPaletteCss, CUSTOMIZABLE_ROLES, clearCustomPaletteCss, getThemeBaseColors } from '../lib/customPalette'
import { isValidHexColor } from '../lib/colorUtils'
import { useTheme } from '../hooks/useTheme'
import { CustomPaletteContext } from './custom-palette-context'

const STORAGE_KEY = 'customPalette'

// A hand-edited (or otherwise corrupted) localStorage value can carry the
// right shape — `colors`/`baseTheme` both present — while individual color
// values are malformed. Every downstream consumer (deriveShades, setProperty)
// degrades harmlessly on a bad hex rather than throwing, but silently accepts
// nonsense colors; validating per-role here, falling back to that role's
// theme default, keeps a corrupted entry from producing a visibly broken
// palette instead of just failing to load one.
function sanitizePaletteColors(colors, baseTheme) {
  const fallback = getThemeBaseColors(baseTheme)
  const sanitized = {}
  for (const { key } of CUSTOMIZABLE_ROLES) {
    sanitized[key] = isValidHexColor(colors?.[key]) ? colors[key] : fallback[key]
  }
  return sanitized
}

function readStoredPalette() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !parsed.colors || typeof parsed.baseTheme !== 'string') return null
    return { ...parsed, colors: sanitizePaletteColors(parsed.colors, parsed.baseTheme) }
  } catch {
    return null
  }
}

// Separate from ThemeContext's own "theme" persistence on purpose (a
// different localStorage key) — the two are independent settings that
// happen to interact at render time (this one's CSS overrides sit on top of
// whichever `[data-theme]` ThemeContext has active), not one setting that
// subsumes the other. A stored custom palette survives switching the preset
// theme in ThemePicker; only unchecking "on" here falls back to the preset.
export function CustomPaletteProvider({ children }) {
  const { theme } = useTheme()
  const [customPalette, setCustomPalette] = useState(() => {
    const stored = readStoredPalette()
    if (stored) return stored
    return { isActive: false, baseTheme: theme, colors: getThemeBaseColors(theme) }
  })

  // Single source of truth: whenever the palette (or its on/off flag)
  // changes, sync it to both the live DOM and localStorage, mirroring
  // ThemeContext's own effect for the same reason — one place that can't
  // drift out of sync with what's actually rendered.
  useEffect(() => {
    if (customPalette.isActive) {
      applyCustomPaletteCss(customPalette.colors)
    } else {
      clearCustomPaletteCss()
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customPalette))
    } catch {
      // localStorage unavailable (private browsing, quota, etc.) — the
      // override is already applied to the DOM, so it still works this
      // session.
    }
  }, [customPalette])

  const setBaseTheme = useCallback((nextTheme) => {
    setCustomPalette((previous) => ({
      ...previous,
      baseTheme: nextTheme,
      colors: getThemeBaseColors(nextTheme),
    }))
  }, [])

  // The native <input type="color"> this is wired to always emits a
  // well-formed "#rrggbb" string, so this guard is defense-in-depth against
  // any other caller (a future non-native picker, a devtools-driven call)
  // rather than something the current UI can trigger.
  const setColor = useCallback((role, hex) => {
    if (!isValidHexColor(hex)) return
    setCustomPalette((previous) => ({ ...previous, colors: { ...previous.colors, [role]: hex } }))
  }, [])

  // Per-role reset re-reads that one role's value from the current base
  // theme rather than remembering "what it was before the user's last
  // edit" — simpler mental model (every reset, per-role or all, always
  // means "back to what baseTheme actually looks like right now").
  const resetColor = useCallback((role) => {
    setCustomPalette((previous) => ({
      ...previous,
      colors: { ...previous.colors, [role]: getThemeBaseColors(previous.baseTheme)[role] },
    }))
  }, [])

  const resetAll = useCallback(() => {
    setCustomPalette((previous) => ({ ...previous, colors: getThemeBaseColors(previous.baseTheme) }))
  }, [])

  const setActive = useCallback((isActive) => {
    setCustomPalette((previous) => ({ ...previous, isActive }))
  }, [])

  const value = { customPalette, setBaseTheme, setColor, resetColor, resetAll, setActive }

  return <CustomPaletteContext.Provider value={value}>{children}</CustomPaletteContext.Provider>
}
