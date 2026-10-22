import test from 'node:test'
import assert from 'node:assert/strict'
import { buyCosmetic, equipCosmetic, equippedCosmetics, ownedCosmetics } from '../src/pet/cosmetics.js'

const state = (overrides = {}) => ({ coins: 100, pet: { name: 'Pal', level: 4, xp: 70, mood: 85 }, ...overrides })
test('buying uses catalog prices, preserves progress, and does not equip a preview', () => {
  const original = state()
  const next = buyCosmetic(original, 'coral-bow')
  assert.equal(next.coins, 80)
  assert.deepEqual(next.ownedCosmetics, ['coral-bow'])
  assert.deepEqual(next.pet, original.pet)
  assert.equal(original.coins, 100)
  assert.deepEqual(equippedCosmetics(next), {})
})
test('unknown, unaffordable, locked, and duplicate purchases cannot change state', () => {
  assert.throws(() => buyCosmetic(state(), 'free-coins'))
  const poor = state({ coins: 19 })
  assert.throws(() => buyCosmetic(poor, 'coral-bow'), /20 coins/)
  assert.equal(poor.coins, 19)
  assert.throws(() => buyCosmetic(state({ pet: { level: 1 } }), 'blue-cap'), /level 2/)
  const owned = buyCosmetic(state(), 'coral-bow')
  assert.throws(() => buyCosmetic(owned, 'coral-bow'), /already own/)
  assert.equal(owned.coins, 80)
})
test('only owned items equip; one hat replaces another while a bow stays equipped', () => {
  let next = state({ ownedCosmetics: ['coral-bow', 'blue-cap', 'gold-crown'] })
  assert.throws(() => equipCosmetic(state(), { id: 'coral-bow' }), /Buy/)
  next = equipCosmetic(next, { id: 'coral-bow' })
  next = equipCosmetic(next, { id: 'blue-cap' })
  next = equipCosmetic(next, { id: 'gold-crown' })
  assert.deepEqual(equippedCosmetics(next), { head: 'gold-crown', neck: 'coral-bow' })
  assert.equal(next.coins, 100)
  next = equipCosmetic(next, { id: null, slot: 'head' })
  assert.deepEqual(equippedCosmetics(next), { neck: 'coral-bow' })
  assert.deepEqual(ownedCosmetics(next), ['coral-bow', 'blue-cap', 'gold-crown'])
  assert.throws(() => equipCosmetic(next, { id: null, slot: 'coins' }))
})
test('existing profiles default to no cosmetics and invalid saved items do not render', () => {
  assert.deepEqual(equippedCosmetics(state()), {})
  const saved = state({ ownedCosmetics: ['coral-bow', 'coral-bow', 'unknown'], pet: { cosmetics: { head: 'coral-bow', neck: 'blue-cap' } } })
  assert.deepEqual(ownedCosmetics(saved), ['coral-bow'])
  assert.deepEqual(equippedCosmetics(saved), {})
})
