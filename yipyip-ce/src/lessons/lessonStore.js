import { localDayKey } from './calendar.js'
import { getLesson } from './catalog.js'
import { lessonProgress } from './engagement.js'
let connection
function database() {
  if (!connection) connection = new Promise((resolve, reject) => {
    // Keep the original database name so a branding change does not reset history.
    const request = indexedDB.open('dopal-lessons', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('attempts', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => { connection = null; reject(request.error) }
  })
  return connection
}
async function read(action) {
  const db = await database()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attempts', 'readonly')
    const request = action(tx.objectStore('attempts'))
    tx.oncomplete = () => resolve(request.result)
    tx.onerror = () => reject(tx.error)
  })
}
export const getAttempt = id => read(store => store.get(id))
export async function listCompletions() {
  const attempts = await read(store => store.getAll())
  return attempts.filter(item => item.completedAt).map(({ messages, ...summary }) => summary).sort((a, b) => b.completedAt - a.completedAt)
}
export async function getDraft(lessonId) {
  const attempts = await read(store => store.getAll())
  return attempts.filter(item => item.lessonId === lessonId && !item.completedAt && !item.abandonedAt).sort((a, b) => b.updatedAt - a.updatedAt)[0]
}
export async function saveAttempt(attempt, complete = false) {
  const lesson = getLesson(attempt.lessonId)
  if (complete && (!lesson || !lessonProgress(attempt.messages, lesson.requiredReplies, attempt.paused).canComplete)) throw new Error('Complete three engaged replies and bring the conversation back on track first.')
  const db = await database()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('attempts', 'readwrite')
    const store = tx.objectStore('attempts')
    let value
    const request = store.get(attempt.id)
    request.onsuccess = () => {
      if (request.result?.completedAt) { value = request.result; return }
      const now = Date.now()
      value = { ...attempt, updatedAt: now, ...(complete ? { completedAt: now, dayKey: localDayKey(now) } : {}) }
      store.put(value)
    }
    tx.oncomplete = () => resolve(value)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Could not save the lesson.'))
  })
}
