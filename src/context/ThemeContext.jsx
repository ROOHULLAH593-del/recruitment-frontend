import { useCallback, useEffect, useState } from 'react'
import { ThemeContext } from './theme-context'

const STORAGE_KEY = 'theme'
const DEFAULT_THEME = 'warm'

// "warm" is the live default. "warm", "dark", and "bold" are all selectable
// live via ThemePicker (in the Settings panel's Themes tab). "default" is
// registered (its CSS variables live under the matching [data-theme="x"]
// block in index.css) but was never made user-facing — kept as a candidate,
// not offered in ThemePicker's THEME_OPTIONS.
const AVAILABLE_THEMES = ['default', 'warm', 'dark', 'bold']

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return AVAILABLE_THEMES.includes(stored) ? stored : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStoredTheme)

  // Single source of truth: whenever `theme` changes (including on mount),
  // sync it to the DOM. index.html also sets data-theme="warm" statically so
  // there's no flash before this effect runs; this effect is what makes a
  // stored non-default preference take over once a picker UI exists.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)

    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // localStorage unavailable (private browsing, quota, etc.) — the
      // attribute is already set, so the theme still applies this session.
    }
  }, [theme])

  const selectTheme = useCallback((next) => {
    if (AVAILABLE_THEMES.includes(next)) setTheme(next)
  }, [])

  const value = {
    theme,
    setTheme: selectTheme,
    availableThemes: AVAILABLE_THEMES,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
