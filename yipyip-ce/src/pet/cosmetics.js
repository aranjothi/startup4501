// Prices and unlocks are authoritative in the background worker, never the UI.
export const COSMETICS = [
  { id: 'coral-bow', name: 'Coral bow', slot: 'neck', cost: 20, level: 1, description: 'A little dressed up.' },
  { id: 'blue-cap', name: 'Blue cap', slot: 'head', cost: 40, level: 2, description: 'Ready for a new adventure.' },
  { id: 'gold-crown', name: 'Golden crown', slot: 'head', cost: 80, level: 4, description: 'For a conversation champion.' },
]

export const getCosmetic = id => COSMETICS.find(item => item.id === id)
export function ownedCosmetics(state) {
  return [...new Set((state.ownedCosmetics ?? []).filter(id => getCosmetic(id)))]
}
export function equippedCosmetics(state) {
  const owned = ownedCosmetics(state)
  return Object.fromEntries(['head', 'neck'].flatMap(slot => {
    const id = state.pet?.cosmetics?.[slot]
    return owned.includes(id) && getCosmetic(id)?.slot === slot ? [[slot, id]] : []
  }))
}
export function buyCosmetic(state, id) {
  const item = getCosmetic(id)
  if (!item) throw new Error('That accessory is not available.')
  if (ownedCosmetics(state).includes(id)) throw new Error('You already own this accessory.')
  if (state.pet.level < item.level) throw new Error(`Reach level ${item.level} to unlock ${item.name}.`)
  if (!Number.isFinite(state.coins) || state.coins < item.cost) throw new Error(`You need ${item.cost} coins for ${item.name}.`)
  const next = structuredClone(state)
  next.coins -= item.cost
  next.ownedCosmetics = [...ownedCosmetics(state), id]
  return next
}
export function equipCosmetic(state, { id, slot } = {}) {
  const item = getCosmetic(id)
  if (id !== null && (!item || !ownedCosmetics(state).includes(id))) throw new Error('Buy this accessory before wearing it.')
  const target = id === null ? slot : item.slot
  if (!['head', 'neck'].includes(target)) throw new Error('Choose a head or neck accessory.')
  const next = structuredClone(state)
  next.pet.cosmetics = equippedCosmetics(state)
  if (id === null) delete next.pet.cosmetics[target]
  else next.pet.cosmetics[target] = id
  return next
}
