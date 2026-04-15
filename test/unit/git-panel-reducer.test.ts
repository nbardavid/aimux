import { expect, test } from 'bun:test'

import type { AppState, GitFileEntry } from '../../src/state/types'

import { emptyGitPanel } from '../../src/state/reducers/git-panel-state'
import { appReducer, createInitialState } from '../../src/state/store'

function seedState(): AppState {
  return createInitialState()
}

function entry(overrides: Partial<GitFileEntry> = {}): GitFileEntry {
  return {
    added: 0,
    path: 'f.ts',
    removed: 0,
    section: 'unstaged',
    status: 'M',
    ...overrides,
  }
}

test('toggle-sidebar-view swaps views', () => {
  const s0 = seedState()
  const s1 = appReducer(s0, { type: 'toggle-sidebar-view' })
  expect(s1.sidebar.view).toBe('git')
  const s2 = appReducer(s1, { type: 'toggle-sidebar-view' })
  expect(s2.sidebar.view).toBe('tabs')
})

test('toggle-sidebar-view reveals hidden sidebar when switching to git', () => {
  const s0 = { ...seedState(), sidebar: { ...seedState().sidebar, visible: false } }
  const s1 = appReducer(s0, { type: 'toggle-sidebar-view' })
  expect(s1.sidebar.visible).toBe(true)
  expect(s1.sidebar.view).toBe('git')
})

test('git-refresh-success replaces files + branch state', () => {
  const s0 = seedState()
  const files = [entry({ path: 'a.ts' }), entry({ path: 'b.ts' })]
  const s1 = appReducer(s0, {
    payload: { ahead: 1, behind: 0, branch: 'main', files },
    type: 'git-refresh-success',
  })
  expect(s1.gitPanel.branch).toBe('main')
  expect(s1.gitPanel.ahead).toBe(1)
  expect(s1.gitPanel.files).toHaveLength(2)
  expect(s1.gitPanel.loading).toBe(false)
  expect(s1.gitPanel.error).toBeNull()
})

test('git-refresh-error clears files and stores kind', () => {
  const preloaded = {
    ...seedState(),
    gitPanel: { ...emptyGitPanel(), files: [entry()] },
  }
  const s1 = appReducer(preloaded, { kind: 'not-a-repo', type: 'git-refresh-error' })
  expect(s1.gitPanel.error).toBe('not-a-repo')
  expect(s1.gitPanel.files).toHaveLength(0)
})

test('scroll-git-panel clamps between 0 and maxOffset', () => {
  const s0 = seedState()
  const up = appReducer(s0, { delta: -5, maxOffset: 10, type: 'scroll-git-panel' })
  expect(up.gitPanel.scrollOffset).toBe(0)
  const down = appReducer(s0, { delta: 20, maxOffset: 10, type: 'scroll-git-panel' })
  expect(down.gitPanel.scrollOffset).toBe(10)
  const partial = appReducer(s0, { delta: 3, maxOffset: 10, type: 'scroll-git-panel' })
  expect(partial.gitPanel.scrollOffset).toBe(3)
})
