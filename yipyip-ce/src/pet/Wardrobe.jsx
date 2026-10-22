import { useEffect, useState } from 'react'
import { FiCheck, FiEye, FiLock, FiShoppingBag } from 'react-icons/fi'
import { COSMETICS, equippedCosmetics, ownedCosmetics } from './cosmetics.js'
import PetAppearance, { COSMETIC_IMAGES } from './PetAppearance'
import coin from '../assets/ui/coin.png'
import './Wardrobe.css'
import Poof from './Poof'

export default function Wardrobe({ userState, onUpdate, mode = 'customize', externalBusy = false, onBusyChange = () => {} }) {
  const shopping = mode === 'shop'
  const [preview, setPreview] = useState(() => equippedCosmetics(userState))
  const [poof, setPoof] = useState(0)
  useEffect(() => {
    if (!poof) return
    const timer = setTimeout(() => setPoof(0), 850)
    return () => clearTimeout(timer)
  }, [poof])
  function puff() { setPoof(value => value + 1) }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const owned = ownedCosmetics(userState)
  const equipped = equippedCosmetics(userState)
  const look = shopping ? preview : equipped
  const disabled = busy || externalBusy
  const changed = shopping && ['head', 'neck'].some(slot => preview[slot] !== equipped[slot])
  const items = COSMETICS.filter(entry => shopping || owned.includes(entry.id))

  async function act(type, payload) {
    if (disabled) return
    setBusy(true); onBusyChange(true); setError(''); setNotice('')
    try {
      const result = await chrome.runtime.sendMessage({ type, payload })
      if (result.error) throw new Error(result.error)
      onUpdate(result.payload)
      setPreview(equippedCosmetics(result.payload))
      puff()
      if (type === 'BUY_COSMETIC') setNotice('Added to your collection. Wear it in Customize.')
    } catch (err) { setError(err.message) }
    finally { setBusy(false); onBusyChange(false) }
  }
  function toggle(entry) {
    if (disabled) return
    setError(''); setNotice('')
    if (shopping) {
      if (owned.includes(entry.id)) return
      puff()
      setPreview(current => {
        const next = { ...current }
        if (current[entry.slot] === entry.id) {
          if (equipped[entry.slot]) next[entry.slot] = equipped[entry.slot]
          else delete next[entry.slot]
        } else next[entry.slot] = entry.id
        return next
      })
    } else {
      act('EQUIP_COSMETIC', equipped[entry.slot] === entry.id ? { id: null, slot: entry.slot } : { id: entry.id })
    }
  }
  return <>
    <section className="wardrobe-preview" aria-label="Pet accessory preview">
      <div className="wardrobe-preview-heading"><span>Level {userState.pet.level}</span></div>
      <div className="wardrobe-pet-stage"><svg className="wardrobe-cloud" viewBox="0 0 280 200" aria-hidden="true"><path d="M47 177C22 181 5 167 5 148C5 132 14 120 28 115C16 93 31 69 55 67C52 42 78 25 102 35C115 8 149 7 166 32C191 15 220 31 220 56C247 49 271 68 268 92C291 105 288 135 271 147C277 168 260 185 237 181C218 199 192 196 177 184C157 201 130 198 114 185C94 199 66 192 59 177Z" /></svg><PetAppearance pet={userState.pet} cosmetics={look} />{poof > 0 && <Poof key={poof} onDone={() => setPoof(0)} />}</div>
      <p className="wardrobe-preview-caption" aria-live="polite">{changed ? <><FiEye aria-hidden="true" />Trying on · not saved</> : <><FiCheck aria-hidden="true" />Current look</>}</p>
    </section>
    <div className={`wardrobe-items ${shopping ? 'wardrobe-shop' : 'wardrobe-owned'}`}>
      {items.map(entry => {
        const purchased = owned.includes(entry.id)
        const wearing = look[entry.slot] === entry.id
        const locked = userState.pet.level < entry.level
        const affordable = userState.coins >= entry.cost
        return <article key={entry.id} className={`wardrobe-item ${wearing ? 'is-wearing' : ''} ${shopping && purchased ? 'is-owned' : ''}`} aria-label={entry.name}>
          {shopping && purchased && <span className="wardrobe-owned-badge"><FiCheck aria-hidden="true" />Owned</span>}
          <button type="button" className="wardrobe-item-toggle" aria-label={`${shopping ? 'Try on' : 'Wear'} ${entry.name}`} aria-pressed={wearing} onClick={() => toggle(entry)} disabled={disabled || (shopping && purchased)}>
            <span className="wardrobe-item-art"><img src={COSMETIC_IMAGES[entry.id]} alt="" /></span>
            <strong>{entry.name}</strong>
            {!shopping && <span className="wardrobe-item-meta">{wearing ? <><FiCheck aria-hidden="true" />Wearing</> : 'Wear'}</span>}
          </button>
          {shopping && !purchased && <>
            <span className="wardrobe-item-meta"><img src={coin} alt="" />{entry.cost}</span>
            <button type="button" className="wardrobe-buy" aria-label={locked ? `${entry.name} unlocks at level ${entry.level}` : `Buy ${entry.name} for ${entry.cost} coins`} title={!locked && !affordable ? `You need ${entry.cost - userState.coins} more coins.` : undefined} disabled={disabled || locked || !affordable} onClick={() => act('BUY_COSMETIC', { id: entry.id })}>
              {locked ? <><FiLock aria-hidden="true" />Level {entry.level}</> : <><FiShoppingBag aria-hidden="true" />Buy</>}
            </button>
          </>}
        </article>
      })}
    </div>
    {!shopping && !owned.length && <p className="panel-description wardrobe-empty">Your collection is waiting. Visit the Shop to try on and buy accessories.</p>}
    {error && <p className="lesson-error" role="alert">{error}</p>}
    {notice && <p className="wardrobe-notice" role="status">{notice}</p>}
  </>
}
