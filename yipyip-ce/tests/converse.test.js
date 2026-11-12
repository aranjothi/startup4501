import test from 'node:test'
import assert from 'node:assert/strict'
import * as calendar from '../src/lessons/calendar.js'
import { build } from 'esbuild'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

let render
let renderOptions
const root = dirname(dirname(fileURLToPath(import.meta.url)))
test.before(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'yipyip-converse-test-'))
  try {
    const result = await build({ stdin: { resolveDir: root, loader: 'jsx', contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import LessonFeed, { ConversationOptions } from './src/lessons/LessonFeed.jsx'; export const renderOptions = props => renderToStaticMarkup(React.createElement(ConversationOptions, props)); export const render = props => renderToStaticMarkup(React.createElement(LessonFeed, props));` }, bundle: true, jsx: 'automatic', platform: 'node', format: 'cjs', write: false, loader: { '.css': 'empty' }, plugins: [{ name: 'test-images', setup(build) { build.onLoad({ filter: /\.png$/ }, () => ({ contents: "export default 'test-image.png'" })) } }], logLevel: 'silent' })
    const path = join(dir, 'render.cjs')
    await writeFile(path, result.outputFiles[0].contents)
    const loaded = (await import(pathToFileURL(path).href)).default
    render = loaded.render
    renderOptions = loaded.renderOptions
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('daily goal pie progress handles empty, partial, complete, exceeded, and missing goals', () => {
  for (const [completed, goal, fraction, caption] of [[0, 3, 0, '3 lessons to go'], [2, 3, 2 / 3, '1 lesson to go'], [3, 3, 1, '0 lessons to go'], [4, 3, 1, '0 lessons to go'], [0, undefined, 0, '1 lesson to go'], [0, null, 0, '1 lesson to go']]) {
    const progress = calendar.dailyGoalProgress(completed, goal)
    assert.equal(progress.fraction, fraction)
    assert.equal(progress.caption, caption)
  }
})
test('Converse shows an accessible daily-goal pie, remaining caption, and controls before topics', () => {
  const html = render({ coins: 10, profile: { topics: ['everyday'], dailyGoal: 3 }, completions: [
    { lessonId: 'everyday-1', dayKey: calendar.localDayKey() },
    { lessonId: 'everyday-2', dayKey: calendar.localDayKey() },
    { lessonId: 'everyday-3', dayKey: '1900-01-01' },
  ] })
  assert.match(html, /aria-label="Converse"/)
  assert.match(html, /role="img"[^>]*aria-label="2 of 3 conversational lessons completed today"/)
  assert.match(html, /1 lesson to go/)
  assert.match(html, /Edit focus/)
  assert.match(html, /All topics/)
  assert.ok(html.indexOf('Edit focus') < html.indexOf('Everyday conversations'))
  assert.ok(html.indexOf('All topics') < html.indexOf('Everyday conversations'))
})
test('Converse caps a completed pie at full while retaining the actual completion count', () => {
  const html = render({ profile: { topics: ['everyday'], dailyGoal: 1 }, completions: [{ lessonId: 'everyday-1', dayKey: calendar.localDayKey() }, { lessonId: 'everyday-2', dayKey: calendar.localDayKey() }] })
  assert.match(html, /2 of 1 conversational lessons completed today/)
  assert.match(html, /--goal-progress:100%/)
  assert.match(html, /0 lessons to go/)
})

test('the pie displays its completion fraction inside the chart', () => {
  const html = render({ profile: { topics: ['everyday'], dailyGoal: 3 }, completions: [{ lessonId: 'everyday-1', dayKey: calendar.localDayKey() }] })
  assert.match(html, /class="converse-goal-pie"[^>]*><span[^>]*>1\/3<\/span><\/div>/)
})
test('Options groups both controls and All topics retains its label in either state', () => {
  for (const all of [false, true]) {
    const html = renderOptions({ all })
    assert.match(html, /<legend>Options<\/legend>/)
    assert.match(html, /Edit focus/)
    assert.match(html, new RegExp(`aria-pressed="${all}"`))
    assert.match(html, /All topics/)
    assert.doesNotMatch(html, /My topics/)
  }
})
