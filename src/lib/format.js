export function formatSalaryRange(min, max) {
  const format = (value) => `Rs ${Number(value).toLocaleString()}`

  if (min && max) return `${format(min)} - ${format(max)}`
  if (min) return `From ${format(min)}`
  if (max) return `Up to ${format(max)}`

  return null
}
