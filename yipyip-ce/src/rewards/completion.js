import { SESSION_REWARD } from '../practice/scenarios.js'

export function workCompletion(state, sessionId) {
  const entry = state.work?.history?.find(item => item.id === sessionId)
  if (!entry) throw new Error('Could not find the completed work session.')
  return { state, notification: { id: `work:${entry.id}`, title: 'Task complete!', coins: entry.coins, xp: entry.xp ?? entry.coins, awarded: true } }
}

export function conversationCompletion(response, attemptId, kind = 'conversation') {
  if (response.error || !response.payload) throw new Error(response.error || 'Could not save the conversation reward.')
  const awarded = response.awarded === true
  return { state: response.payload, notification: { id: `${kind}:${attemptId}`, title: 'Conversation complete!', coins: awarded ? SESSION_REWARD.coins : 0, xp: awarded ? SESSION_REWARD.xp : 0, awarded } }
}

export function presentCompletion(completion, effects, seen) {
  if (seen.has(completion.notification.id)) return
  seen.add(completion.notification.id)
  effects.setUserState(completion.state)
  effects.setScreen('home')
  effects.setNotification(completion.notification)
}

export function scheduleRewardNotification(onExit, onDone, clock = globalThis) {
  let exitTimer
  const holdTimer = clock.setTimeout(() => {
    onExit()
    exitTimer = clock.setTimeout(onDone, 260)
  }, 5000)
  return () => { clock.clearTimeout(holdTimer); clock.clearTimeout(exitTimer) }
}
