export function localDayKey(value = new Date()) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function dayNumber(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return NaN
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return NaN
  return date.getTime() / 86400000
}
export function practiceStats(completions, now = new Date()) {
  const today = dayNumber(localDayKey(now))
  const days = [...new Set(completions.filter(item => item.completedAt).map(item => dayNumber(item.dayKey ?? localDayKey(item.completedAt))))].filter(value => Number.isFinite(value) && value <= today).sort((a, b) => a - b)
  const set = new Set(days)
  let current = 0
  let cursor = set.has(today) ? today : today - 1
  while (set.has(cursor--)) current++
  let longest = 0, run = 0, previous = -Infinity
  for (const day of days) { run = day === previous + 1 ? run + 1 : 1; longest = Math.max(longest, run); previous = day }
  return { current, longest, daysPracticed: days.length }
}
export function monthDays(year, month) {
  const start = (new Date(year, month, 1).getDay() + 6) % 7
  const count = new Date(year, month + 1, 0).getDate()
  return [...Array(start).fill(null), ...Array.from({ length: count }, (_, index) => ({ day: index + 1, key: localDayKey(new Date(year, month, index + 1)) }))]
}
