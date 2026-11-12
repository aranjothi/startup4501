import { serverUrl } from '../lessons/serverUrl.js'
import { validatePlan } from './model.js'

const BASE = serverUrl(import.meta.env?.VITE_AI_SERVER_URL)
export async function suggestTask(description, signal) {
  signal?.throwIfAborted()
  let response
  try {
    response = await fetch(`${BASE}/api/task-plan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60000)]) : AbortSignal.timeout(60000),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('Task suggestions are temporarily unavailable. Try again or create your task manually.')
  }
  signal?.throwIfAborted()
  const plan = await response.json()
  if (!response.ok) throw new Error(plan.error || 'Couldn’t suggest a task. Please retry.')
  return validatePlan(plan)
}
export async function sendWork(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, payload })
  if (response?.error) throw new Error(response.error)
  if (!response?.payload) throw new Error('Couldn’t save your work. Please retry.')
  return response.payload
}
