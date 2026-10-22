import './Poof.css'

const PUFFS = [
  [-54, -30, 33], [-29, -61, 39], [10, -65, 34], [49, -38, 38],
  [59, 7, 30], [35, 43, 38], [-9, 49, 34], [-49, 29, 39], [-8, -8, 56],
]

export default function Poof({ onDone }) {
  return <span className="pet-poof" aria-hidden="true" onAnimationEnd={event => {
    if (event.target === event.currentTarget) onDone()
  }}>
    {PUFFS.map(([x, y, size], i) => <i key={i} style={{ '--puff-x': `${x}px`, '--puff-y': `${y}px`, '--puff-size': `${size}px`, '--puff-turn': `${i * 41}deg` }} />)}
  </span>
}
