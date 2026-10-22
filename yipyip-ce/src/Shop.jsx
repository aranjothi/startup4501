import { useState } from 'react'
import PanelScreen from './components/PanelScreen'
import coinImg from './assets/ui/coin.png'
import treatImg from './assets/ui/treat.png'
import './Shop.css'
import Wardrobe from './pet/Wardrobe'

const ITEMS = [{ id: 'treat', name: 'Treat', desc: 'Restores 10 hunger', cost: 10, img: treatImg }]

export default function Shop({ onClose, userState, onUpdate }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function handleBuy(item) {
    if (userState.coins < item.cost || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await chrome.runtime.sendMessage({ type: 'BUY_TREAT' })
      if (res.error) throw new Error(res.error)
      if (res.type === 'BUY_TREAT_SUCCESS') onUpdate(res.payload)
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  const coins = userState.coins ?? 0
  return <PanelScreen title="Shop" coins={coins} onBack={onClose} backDisabled={busy} className="shop-screen">
    {error && <p className="shop-error" role="alert">{error}</p>}
    {ITEMS.map(item => <div key={item.id} className="panel-card shop-item-card">
      <img src={item.img} className="shop-item-img" alt={item.name} />
      <div className="shop-item-info"><span className="shop-item-name">{item.name}</span><span className="shop-item-desc">{item.desc}</span></div>
      <button className="panel-action shop-buy-btn" onClick={() => handleBuy(item)} disabled={coins < item.cost || busy}>
        <img src={coinImg} className="shop-buy-coin" alt="" />{item.cost}
      </button>
    </div>)}
    <h3 className="shop-section-heading">Accessories</h3>
    <Wardrobe mode="shop" userState={userState} onUpdate={onUpdate} externalBusy={busy} onBusyChange={setBusy} />
  </PanelScreen>
}
