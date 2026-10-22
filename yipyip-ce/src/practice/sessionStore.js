// Keep existing recordings accessible across the YipYip rename.
const DATABASE = 'dopal-practice'
const MAX_SESSIONS = 20
let databasePromise

function database() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore('sessions', { keyPath: 'id' })
        request.result.createObjectStore('recordings')
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => { databasePromise = null; reject(request.error) }
    })
  }
  return databasePromise
}

async function transaction(mode, action) {
  const db = await database()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['sessions', 'recordings'], mode)
    const requests = action(tx.objectStore('sessions'), tx.objectStore('recordings'))
    tx.oncomplete = () => resolve(requests?.map(request => request?.result))
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Storage operation was cancelled.'))
  })
}

export async function listSessions() {
  const [sessions] = await transaction('readonly', store => [store.getAll()])
  return sessions.sort((a, b) => b.createdAt - a.createdAt)
}
export async function getSession(id) {
  const [session, blob] = await transaction('readonly', (sessions, recordings) => [sessions.get(id), recordings.get(id)])
  return session ? { ...session, blob } : undefined
}
export const deleteSession = id => transaction('readwrite', (sessions, recordings) => [sessions.delete(id), recordings.delete(id)])
export async function saveSession({ blob, ...session }) {
  await transaction('readwrite', (sessions, recordings) => [sessions.put(session), recordings.put(blob, session.id)])
  // Only prune after the new recording has committed successfully.
  const sessions = await listSessions()
  if (sessions.length > MAX_SESSIONS) {
    await transaction('readwrite', (metadata, recordings) => {
      for (const old of sessions.slice(MAX_SESSIONS)) {
        metadata.delete(old.id)
        recordings.delete(old.id)
      }
    })
  }
}
