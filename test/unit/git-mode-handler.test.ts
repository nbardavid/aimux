import { expect, test } from 'bun:test'

import type { KeyInput } from '../../src/input/modes/types'
import type { AppState, GitFileEntry } from '../../src/state/types'

import { gitMode } from '../../src/input/modes/handlers/git-mode'
import { navigationMode } from '../../src/input/modes/handlers/navigation'
import { appReducer, createInitialState } from '../../src/state/store'

function entry(path: string): GitFileEntry {
  return { added: 0, path, removed: 0, section: 'unstaged', status: 'M' }
}

function seedWithFiles(files: GitFileEntry[]): AppState {
  const s0 = createInitialState()
  const s1 = appReducer(s0, {
    payload: { ahead: 0, behind: 0, branch: 'main', files },
    type: 'git-refresh-success',
  })
  return appReducer(s1, { type: 'enter-git-mode' })
}

function key(overrides: Partial<KeyInput>): KeyInput {
  return {
    ctrl: false,
    meta: false,
    name: '',
    sequence: '',
    shift: false,
    ...overrides,
  }
}

test('navigation Ctrl+D enters git mode with transition', () => {
  const state = createInitialState()
  const result = navigationMode.handleKey(key({ ctrl: true, name: 'd' }), { state })
  expect(result).not.toBeNull()
  expect(result?.transition).toBe('git-mode')
  expect(result?.actions[0]).toEqual({ type: 'enter-git-mode' })
})

test('git-mode Esc transitions back to navigation with exit action', () => {
  const state = seedWithFiles([entry('a.ts')])
  const result = gitMode.handleKey(key({ name: 'escape' }), { state })
  expect(result?.transition).toBe('navigation')
  expect(result?.actions[0]).toEqual({ type: 'exit-git-mode' })
})

test('git-mode j emits select-file action + fetch side effect', () => {
  const state = seedWithFiles([entry('a.ts'), entry('b.ts')])
  const result = gitMode.handleKey(key({ name: 'j' }), { state })
  expect(result?.actions).toEqual([{ delta: 1, type: 'git-mode-select-file' }])
  expect(result?.effects).toEqual([{ path: 'b.ts', type: 'fetch-git-diff' }])
})

test('git-mode j skips fetch if diff already cached', () => {
  let state = seedWithFiles([entry('a.ts'), entry('b.ts')])
  state = appReducer(state, {
    diff: { path: 'b.ts', rawDiff: '', status: 'modified' },
    path: 'b.ts',
    type: 'git-mode-set-diff',
  })
  const result = gitMode.handleKey(key({ name: 'j' }), { state })
  expect(result?.effects).toEqual([])
})

test('git-mode Ctrl+d emits scroll-git-diff effect', () => {
  const state = seedWithFiles([entry('a.ts')])
  const result = gitMode.handleKey(key({ ctrl: true, name: 'd' }), { state })
  expect(result?.actions).toEqual([])
  expect(result?.effects).toEqual([{ delta: 10, type: 'scroll-git-diff' }])
})

test('git-mode Ctrl+u emits scroll-git-diff up effect', () => {
  const state = seedWithFiles([entry('a.ts')])
  const result = gitMode.handleKey(key({ ctrl: true, name: 'u' }), { state })
  expect(result?.effects).toEqual([{ delta: -10, type: 'scroll-git-diff' }])
})

test('git-mode Down emits single-line scroll effect', () => {
  const state = seedWithFiles([entry('a.ts')])
  const result = gitMode.handleKey(key({ name: 'down' }), { state })
  expect(result?.effects).toEqual([{ delta: 1, type: 'scroll-git-diff' }])
})

test('git-mode ignores unrelated keys (isolation)', () => {
  const state = seedWithFiles([entry('a.ts')])
  const result = gitMode.handleKey(key({ ctrl: true, name: 'n' }), { state })
  expect(result?.actions).toEqual([])
  expect(result?.effects).toEqual([])
  expect(result?.transition).toBeUndefined()
})
