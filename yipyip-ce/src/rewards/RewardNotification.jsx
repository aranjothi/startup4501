import { useEffect, useState } from 'react'
import { FiAward, FiStar } from 'react-icons/fi'
import coin from '../assets/ui/coin.png'
import { scheduleRewardNotification } from './completion.js'
import './RewardNotification.css'

export default function RewardNotification({ reward, onDone }) {
  const [exiting, setExiting] = useState(false)
  useEffect(() => scheduleRewardNotification(() => setExiting(true), onDone), [onDone])
  return <aside className={`reward-notification ${exiting ? 'reward-notification-out' : 'reward-notification-in'}`} role="status" aria-live="polite" aria-atomic="true">
    <span className="reward-notification-icon" aria-hidden="true"><FiAward /></span>
    <div className="reward-notification-copy">
      <div className="reward-notification-app"><span>YipYip</span><span>now</span></div>
      <strong>{reward.title}</strong>
      {reward.awarded ? <div className="reward-notification-amounts"><span><img src={coin} alt="" />+{reward.coins} {reward.coins === 1 ? 'coin' : 'coins'}</span><span><FiStar aria-hidden="true" />+{reward.xp} XP</span></div>
        : <p>Rewards already collected</p>}
    </div>
  </aside>
}
