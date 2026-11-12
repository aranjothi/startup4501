import { FiCamera } from 'react-icons/fi'

export default function WorkModeOption({ checked = false, onChange, disabled }) {
  return <button type="button" className="work-mode-option" aria-pressed={checked} disabled={disabled}
    aria-label="Work Mode: 2× coins and XP" aria-description="Optional camera accountability. The timer pauses when you leave frame."
    title="Camera accountability: 2× coins and XP. Pauses out of frame." onClick={() => onChange(!checked)}>
    <FiCamera aria-hidden="true" /><span>Work Mode</span><strong>2×</strong>
  </button>
}
