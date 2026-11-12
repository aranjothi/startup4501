import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

let menu
const root = dirname(dirname(fileURLToPath(import.meta.url)))
test.before(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'yipyip-tasks-test-'))
  try {
    const result = await build({ stdin: { resolveDir: root, loader: 'jsx', contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import TasksMenu from './src/tasks/TasksMenu.jsx';
      export const render = props => renderToStaticMarkup(React.createElement(TasksMenu, props));
      export function choose(label, props) {
        function find(node) {
          if (!React.isValidElement(node)) return;
          if (node.type === 'button' && node.props['aria-label'] === label) return node;
          for (const child of React.Children.toArray(node.props.children)) { const result = find(child); if (result) return result; }
        }
        const button = find(TasksMenu(props));
        if (!button) throw new Error('Missing choice: ' + label);
        button.props.onClick();
      }
    ` }, bundle: true, jsx: 'automatic', platform: 'node', format: 'cjs', write: false, loader: { '.css': 'empty' }, plugins: [{ name: 'test-images', setup(build) { build.onLoad({ filter: /\.png$/ }, () => ({ contents: "export default 'test-image.png'" })) } }], logLevel: 'silent' })
    const path = join(dir, 'menu.cjs')
    await writeFile(path, result.outputFiles[0].contents)
    menu = (await import(pathToFileURL(path).href)).default
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('Tasks presents conversation practice and productivity as two clearly named choices', () => {
  const html = menu.render({ coins: 42 })
  assert.match(html, /aria-label="Tasks"/)
  assert.match(html, /Work on conversations/)
  assert.match(html, /Get tasks done/)
  assert.match(html, /aria-label="42 coins"/)
})
test('each Tasks choice opens its respective menu', () => {
  const opened = []
  const props = { onConversations: () => opened.push('practice'), onWork: () => opened.push('work') }
  menu.choose('Work on conversations', props)
  assert.deepEqual(opened, ['practice'])
  menu.choose('Get tasks done', props)
  assert.deepEqual(opened, ['practice', 'work'])
})
test('Tasks shows a resume hint when a work session is already saved', () => {
  const html = menu.render({ activeWork: { id: 'active-session', title: 'Read' } })
  assert.match(html, /Resume your work session/)
  assert.doesNotMatch(menu.render({}), /Resume your work session/)
})
