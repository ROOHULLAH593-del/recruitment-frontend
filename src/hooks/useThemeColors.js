import { buildCustomThemeColors, getThemeColors } from '../lib/theme'
import { useCustomPalette } from './useCustomPalette'
import { useTheme } from './useTheme'

// Resolves the active theme's real hex color data (for GSAP, which needs
// concrete colors rather than CSS var() references) reactively — re-renders
// whenever the active theme or the custom palette changes, unlike a static
// import. When the custom palette is on, it wins here the same way its CSS
// overrides win on <html> — status badges and the match-score chip (both
// driven by this hook's return value, not CSS vars) should reflect a
// customized success/caution/danger color exactly as visibly as a
// customized primary accent does.
export function useThemeColors() {
  const { theme } = useTheme()
  const { customPalette } = useCustomPalette()

  if (customPalette.isActive) {
    return buildCustomThemeColors(customPalette.baseTheme, customPalette.colors)
  }

  return getThemeColors(theme)
}
