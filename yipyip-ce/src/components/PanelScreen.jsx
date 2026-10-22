import { useEffect, useRef, useState } from 'react'
import coinImg from '../assets/ui/coin.png'
import './PanelScreen.css'

function formatBalance(value) {
  if (value >= 1000000) return `${Math.floor(value / 1000000)}M+`
  if (value >= 1000) return `${Math.floor(value / 1000)}K+`
  return String(value)
}

// Every sidebar overlay follows the original shop's layout and proportions.
export default function PanelScreen({ title, coins = 0, onBack, backDisabled = false, animateBack = true, className = '', label = title, children, footer, topic, header, overlay }) {
  const [closing, setClosing] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  function back() {
    if (closing || backDisabled) return
    if (!animateBack) { onBack(); return }
    setClosing(true)
    timer.current = setTimeout(onBack, 200)
  }
  const balance = formatBalance(coins)
  return <section className={`panel-screen ${closing ? 'panel-closing' : 'panel-opening'} ${className}`} aria-label={label} data-topic={topic}>
    {header || <header className="panel-header" inert={overlay ? '' : undefined}>
      <button type="button" className="panel-back-btn" disabled={backDisabled || closing} onClick={back}>
        <span className="panel-back-text">← Back</span>
      </button>
      <div className="panel-title-pill"><h2 className="panel-title">{title}</h2></div>
      <div className="panel-balance" aria-label={`${coins} coins`}>
        <img src={coinImg} className="panel-balance-icon" alt="" />
        <span style={{ fontSize: balance.length >= 5 ? '10px' : balance.length >= 4 ? '11.5px' : '13px' }}>{balance}</span>
      </div>
    </header>}
    <div className="panel-body" inert={overlay ? '' : undefined}>{children}</div>
    {footer && <div className="panel-footer" inert={overlay ? '' : undefined}>{footer}</div>}
    {overlay}
  </section>
}
