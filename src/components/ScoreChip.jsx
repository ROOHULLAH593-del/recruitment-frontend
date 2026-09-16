import { useThemeColors } from '../hooks/useThemeColors'

// Small colored pill for a 0-100 score (rule-based match score, AI semantic
// match, etc.) — shared so the two scores read as the same kind of number
// wherever they appear, while each caller supplies its own distinct label so
// the two are never visually merged into one figure.
export default function ScoreChip({ score }) {
  const { scoreChip } = useThemeColors()

  if (score === null || score === undefined) {
    return <span className="text-ink/55">—</span>
  }

  const chip = scoreChip(Number(score))

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: chip.bg,
        color: chip.text,
        border: chip.border ? `1.5px solid ${chip.border}` : 'none',
      }}
    >
      {Number(score).toFixed(0)}%
    </span>
  )
}

// The AI score is fallible by design (a failed/slow Gemini call, or simply
// not computed yet) — surfaced as explanatory text rather than the same bare
// "—" used for the rule-based score, so it doesn't read as "0" or as a bug.
export function AiSemanticMatchChip({ score }) {
  if (score === null || score === undefined) {
    return <span className="text-xs italic text-ink/40">AI match unavailable</span>
  }

  return <ScoreChip score={score} />
}
