import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
let render
const root = dirname(dirname(fileURLToPath(import.meta.url)))
test.before(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'yipyip-reward-notification-'))
  try {
    const result = await build({ stdin: { contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import Notification from './src/rewards/RewardNotification.jsx'; export const render = reward => renderToStaticMarkup(React.createElement(Notification, { reward, onDone: () => {} }));`, resolveDir: root, loader: 'jsx' }, bundle: true, jsx: 'automatic', platform: 'node', format: 'cjs', write: false, loader: { '.css': 'empty', '.png': 'dataurl' }, logLevel: 'silent' })
    const path = join(dir, 'render.cjs'); await writeFile(path, result.outputFiles[0].contents)
    render = (await import(pathToFileURL(path).href)).default.render
  } finally { await rm(dir, { recursive: true, force: true }) }
})
test('phone reward notification announces the task or conversation and exact coin and XP awards', () => {
  for (const reward of [{ title: 'Task complete!', coins: 1, xp: 1, awarded: true }, { title: 'Conversation complete!', coins: 10, xp: 30, awarded: true }]) {
    const html = render(reward)
    assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/)
    assert.ok(html.includes(reward.title))
    assert.ok(html.includes(`+${reward.coins} `))
    assert.ok(html.includes(`+${reward.xp} XP`))
    assert.match(html, /reward-notification-in/)
  }
})
test('already collected rewards are acknowledged without claiming a second award', () => {
  const html = render({ title: 'Conversation complete!', coins: 0, xp: 0, awarded: false })
  assert.match(html, /Rewards already collected/)
  assert.doesNotMatch(html, /\+10|\+30/)
})
