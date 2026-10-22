import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

chrome.runtime.connect({ name: 'sidepanel' })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
