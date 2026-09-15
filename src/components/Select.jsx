import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

// Themed, keyboard-accessible replacement for the native <select> — click (or
// Enter/Space/arrow keys) to open, arrow keys to move the highlight, Enter to
// choose, Escape or a click outside to close without changing anything.
// Focus never leaves the trigger button (options are highlighted, not
// individually focused) — the same one keydown handler covers both "closed,
// about to open" and "open, navigating" so there's no focus-management
// hand-off to get wrong.
//
// `onChange` receives a synthetic `{ target: { name, value } }` object rather
// than the raw value — this is deliberate, not a leftover DOM-event habit:
// every existing call site's handler (including shared `handleChange`
// functions that also serve plain <input>s) already destructures
// `event.target`, so this makes the native-<select> swap a pure JSX-tag
// change with zero handler-logic edits anywhere.
export default function Select({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef(null)

  const selectedOption = options.find((option) => String(option.value) === String(value))

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  function openMenu() {
    const currentIndex = options.findIndex((option) => String(option.value) === String(value))
    setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0)
    setIsOpen(true)
  }

  function selectOption(option) {
    onChange({ target: { name, value: option.value } })
    setIsOpen(false)
  }

  function handleKeyDown(event) {
    if (disabled) return

    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openMenu()
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setHighlightedIndex((index) => Math.min(index + 1, options.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setHighlightedIndex((index) => Math.max(index - 1, 0))
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (options[highlightedIndex]) selectOption(options[highlightedIndex])
        break
      case 'Escape':
        event.preventDefault()
        setIsOpen(false)
        break
      case 'Tab':
        setIsOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <span className={`truncate ${selectedOption ? '' : 'text-ink/40'}`}>{selectedOption?.label ?? placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-ink/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="listbox"
            className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full min-w-max overflow-auto rounded-lg border border-ink/10 bg-surface-elevated py-1 shadow-lg"
          >
            {options.map((option, index) => {
              const isSelected = String(option.value) === String(value)
              const isHighlighted = index === highlightedIndex

              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectOption(option)}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${
                    isHighlighted ? 'bg-ink/5' : ''
                  } ${isSelected ? 'font-medium text-jade-deep' : 'text-ink'}`}
                >
                  {option.label}
                  {isSelected && <Check size={14} className="shrink-0" />}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
