import test from 'node:test'
import assert from 'node:assert/strict'
import { deleteAttempt } from '../src/lessons/lessonStore.js'

// A transaction-controlled store makes commit/abort behavior deterministic.
// No browser history or user data is accessed by these tests.
const records = new Map([['first', { id: 'first', messages: ['private reply'] }], ['second', { id: 'second', messages: ['keep this reply'] }]])
let transactionReady, transactions = 0
const nextTransaction = () => new Promise(resolve => { transactionReady = resolve })
globalThis.indexedDB = {
  open(name) {
    assert.equal(name, 'dopal-lessons')
    const request = {}
    queueMicrotask(() => {
      request.result = {
        transaction(store, mode) {
          assert.equal(store, 'attempts')
          assert.equal(mode, 'readwrite')
          transactions++
          const deletes = []
          const tx = {
            objectStore() { return { delete(id) { deletes.push(id) } } },
            commit() { deletes.forEach(id => records.delete(id)); tx.oncomplete() },
            abort() { tx.error = new Error('Storage transaction aborted.'); tx.onabort() },
          }
          transactionReady(tx)
          return tx
        },
      }
      request.onsuccess()
    })
    return request
  },
}

test('conversation deletion waits for commit and removes only the selected attempt', async () => {
  const ready = nextTransaction()
  let resolved = false
  const operation = deleteAttempt('first').then(() => { resolved = true })
  const tx = await ready
  assert.equal(resolved, false)
  assert.equal(records.has('first'), true)
  tx.commit()
  await operation
  assert.equal(resolved, true)
  assert.equal(records.has('first'), false)
  assert.deepEqual(records.get('second').messages, ['keep this reply'])
})
test('failed deletion rejects and preserves the saved conversation', async () => {
  const ready = nextTransaction()
  const operation = deleteAttempt('second')
  const rejected = assert.rejects(operation, /aborted/)
  const tx = await ready
  tx.abort()
  await rejected
  assert.equal(records.has('second'), true)
})
test('an invalid conversation ID cannot start a deletion transaction', async () => {
  const before = transactions
  await assert.rejects(deleteAttempt(''), /Choose a conversation/)
  await assert.rejects(deleteAttempt(undefined), /Choose a conversation/)
  assert.equal(transactions, before)
})
