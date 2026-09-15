import { Check } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

// "default" exists in the theme system as a kept-for-later candidate (see
// index.css) but was never made user-facing — only these 3 are offered here.
const THEME_OPTIONS = [
  { value: 'warm', label: 'Warm', description: 'Cream canvas, plum & sage accents, Fraunces display type.' },
  { value: 'dark', label: 'Dark', description: 'Navy-black canvas, electric cyan accents, outlined status badges.' },
  { value: 'bold', label: 'Bold', description: 'Crisp white canvas, vivid violet accents, Bricolage Grotesque type.' },
]

// Each swatch is a real `data-theme`-scoped element (the same technique the
// style-preview uses) rather than hardcoded hex values duplicated from
// index.css — the swatch colors/fonts are always exactly what that theme
// actually renders, with nothing to keep in sync by hand.
export default function ThemePicker() {
  const { theme, setTheme } = useTheme()

  return (
    <div>
      <p className="text-sm text-ink/55">Choose how the app looks. Applies everywhere and remembers your choice.</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {THEME_OPTIONS.map((option) => {
          const isActive = theme === option.value

          return (
            <button
              key={option.value}
              type="button"
              data-theme={option.value}
              onClick={() => setTheme(option.value)}
              className={`relative overflow-hidden rounded-lg border bg-canvas p-4 text-left font-sans transition-colors ${
                isActive ? 'border-jade ring-2 ring-jade' : 'border-ink/10 hover:border-ink/25'
              }`}
            >
              {isActive && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-jade text-white">
                  <Check size={12} />
                </span>
              )}

              <div className="flex gap-1.5">
                <span className="h-5 w-5 rounded-full bg-jade" />
                <span className="h-5 w-5 rounded-full bg-amber" />
                <span className="h-5 w-5 rounded-full bg-rust" />
              </div>

              <p className="mt-3 font-display text-base text-ink">{option.label}</p>
              <p className="mt-1 text-xs text-ink/55">{option.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
