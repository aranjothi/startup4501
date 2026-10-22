import { useState } from 'react'
import PanelScreen from '../components/PanelScreen'
import Wardrobe from './Wardrobe'

export default function Customize({ userState, onClose, onUpdate }) {
  const [busy, setBusy] = useState(false)
  return <PanelScreen title="Customize" coins={userState.coins} onBack={onClose} backDisabled={busy} className="customize-screen">
    <Wardrobe userState={userState} onUpdate={onUpdate} onBusyChange={setBusy} />
  </PanelScreen>
}
