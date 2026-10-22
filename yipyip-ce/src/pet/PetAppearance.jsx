import { forwardRef } from 'react'
import { COSMETICS } from './cosmetics.js'
import bow from '../assets/cosmetics/coral-bow.png'
import cap from '../assets/cosmetics/blue-cap.png'
import crown from '../assets/cosmetics/gold-crown.png'
import joyous from '../assets/pet/joyous.png'
import happy from '../assets/pet/happy.png'
import neutral from '../assets/pet/neutral.png'
import sad from '../assets/pet/sad.png'
import angry from '../assets/pet/angry.png'
import upset from '../assets/pet/upset.png'
import './PetAppearance.css'

export const COSMETIC_IMAGES = { 'coral-bow': bow, 'blue-cap': cap, 'gold-crown': crown }
export function getPetImage(mood) {
  return mood > 83 ? joyous : mood > 67 ? happy : mood > 50 ? neutral : mood > 33 ? sad : mood > 17 ? angry : upset
}
const PetAppearance = forwardRef(function PetAppearance({ pet, cosmetics = {}, className = '' }, ref) {
  const pose = pet.mood <= 17 ? 'lying' : pet.mood <= 50 ? 'low' : 'sitting'
  const worn = COSMETICS.filter(item => cosmetics[item.slot] === item.id)
  return <span ref={ref} className={`pet-appearance ${className}`} data-pose={pose} role="img" aria-label={`${pet.name}${worn.length ? ` wearing ${worn.map(item => item.name).join(' and ')}` : ''}`}>
    <img className="pet-appearance-base" src={getPetImage(pet.mood)} alt="" />
    {worn.map(item => <img key={item.id} className={`pet-accessory pet-accessory-${item.id}`} src={COSMETIC_IMAGES[item.id]} alt="" />)}
  </span>
})
export default PetAppearance
