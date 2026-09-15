import { useContext } from 'react'
import { CustomPaletteContext } from '../context/custom-palette-context'

export function useCustomPalette() {
  const context = useContext(CustomPaletteContext)

  if (!context) {
    throw new Error('useCustomPalette must be used within a CustomPaletteProvider')
  }

  return context
}
