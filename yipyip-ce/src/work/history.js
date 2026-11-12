export function listWorkHistory(work) {
  return [...(work?.history ?? [])].reverse()
    .map(entry => ({ ...entry, xp: entry.xp ?? entry.coins })) // Earlier sessions awarded one XP per coin.
    .sort((a, b) => b.completedAt - a.completedAt)
}
export function summarizeWorkHistory(entries) {
  return entries.reduce((total, entry) => ({ sessions: total.sessions + 1, seconds: total.seconds + entry.seconds, coins: total.coins + entry.coins, xp: total.xp + entry.xp }), { sessions: 0, seconds: 0, coins: 0, xp: 0 })
}
export function formatWorkDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor(total % 3600 / 60)
  const remainder = total % 60
  return [hours && `${hours}h`, minutes && `${minutes}m`, remainder && `${remainder}s`].filter(Boolean).join(' ') || '0s'
}
