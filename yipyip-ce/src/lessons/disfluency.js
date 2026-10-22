const fillerPattern = /\b(?:u+h+|u+m+|e+r+m+|e+r+)\b(?![-\s]+h(?:uh|m+)\b)/gi

// Counts only literal, unambiguous hesitation tokens in recognized text.
// "Like" and "you know" can carry meaning, so they are not blanket penalties.
export function transcriptFillers(text = '') {
  const counts = new Map()
  for (const match of text.matchAll(fillerPattern)) {
    const token = match[0].toLowerCase()
    const normalized = /^u+h+$/.test(token) ? 'uh' : /^u+m+$/.test(token) ? 'um' : token.includes('m') ? 'erm' : 'er'
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }
  return { total: [...counts.values()].reduce((sum, count) => sum + count, 0), counts: Object.fromEntries(counts) }
}

function withoutFillers(text) {
  return text.replace(fillerPattern, ' ').toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu)?.join(' ') ?? ''
}

export function retainRecognizedFillers(finalText, liveText) {
  const final = finalText.trim(), live = liveText.trim()
  // Preserve recognized hesitations only when all other words agree. Never
  // insert a guessed filler or replace a meaning-changing final correction.
  return transcriptFillers(live).total > transcriptFillers(final).total && withoutFillers(live) === withoutFillers(final) ? live : final
}
