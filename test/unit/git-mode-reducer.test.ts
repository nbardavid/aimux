import { expect, test } from 'bun:test'

import type { AppState, DiffData, GitFileEntry } from '../../src/state/types'

import { appReducer, createInitialState } from '../../src/state/store'

function entry(path: string): GitFileEntry {
  return { added: 0, path, removed: 0, section: 'unstaged', status: 'M' }
}

function seedWithFiles(files: GitFileEntry[]): AppState {
  const s0 = createInitialState()
  return appReducer(s0, {
    payload: { ahead: 0, behind: 0, branch: 'main', files },
    type: 'git-refresh-success',
  })
}

function diff(path: string, lineCount: number): DiffData {
  const lines = Array.from({ length: lineCount }, (_, i) => ({
    kind: 'context' as const,
    lineNumberAfter: i + 1,
    lineNumberBefore: i + 1,
    text: `line ${i}`,
  }))
  return {
    afterLineCount: lineCount,
    beforeLineCount: lineCount,
    lines,
    path,
    status: 'modified',
  }
}

test('enter-git-mode sets focusMode to git and resets scroll/selection', () => {
  const s0 = seedWithFiles([entry('a.ts')])
  const s1 = appReducer(s0, { type: 'enter-git-mode' })
  expect(s1.focusMode).toBe('git')
  expect(s1.gitMode.selectedFileIndex).toBe(0)
  expect(s1.gitMode.scrollOffset).toBe(0)
  expect(s1.gitMode.syncScroll).toBe(true)
})

test('exit-git-mode returns to navigation mode', () => {
  const s0 = seedWithFiles([entry('a.ts')])
  const s1 = appReducer(s0, { type: 'enter-git-mode' })
  const s2 = appReducer(s1, { type: 'exit-git-mode' })
  expect(s2.focusMode).toBe('navigation')
})

test('git-mode-select-file cycles through files with modulo', () => {
  const s0 = seedWithFiles([entry('a.ts'), entry('b.ts'), entry('c.ts')])
  const s1 = appReducer(s0, { type: 'enter-git-mode' })
  const s2 = appReducer(s1, { delta: 1, type: 'git-mode-select-file' })
  expect(s2.gitMode.selectedFileIndex).toBe(1)
  const s3 = appReducer(s2, { delta: 1, type: 'git-mode-select-file' })
  expect(s3.gitMode.selectedFileIndex).toBe(2)
  const s4 = appReducer(s3, { delta: 1, type: 'git-mode-select-file' })
  expect(s4.gitMode.selectedFileIndex).toBe(0)
  const s5 = appReducer(s4, { delta: -1, type: 'git-mode-select-file' })
  expect(s5.gitMode.selectedFileIndex).toBe(2)
})

test('git-mode-select-file is no-op when files empty', () => {
  const s0 = createInitialState()
  const s1 = appReducer(s0, { type: 'enter-git-mode' })
  const s2 = appReducer(s1, { delta: 1, type: 'git-mode-select-file' })
  expect(s2).toBe(s1)
})

test('git-mode-scroll clamps within diff bounds', () => {
  const s0 = seedWithFiles([entry('a.ts')])
  const s1 = appReducer(s0, { type: 'enter-git-mode' })
  const s2 = appReducer(s1, {
    diff: diff('a.ts', 5),
    path: 'a.ts',
    type: 'git-mode-set-diff',
  })
  const s3 = appReducer(s2, { delta: 10, type: 'git-mode-scroll' })
  expect(s3.gitMode.scrollOffset).toBe(4)
  const s4 = appReducer(s3, { delta: -100, type: 'git-mode-scroll' })
  expect(s4.gitMode.scrollOffset).toBe(0)
})

test('git-mode-toggle-sync flows sync → before-focused → synced', () => {
  const s0 = seedWithFiles([entry('a.ts')])
  const s1 = appReducer(s0, { type: 'enter-git-mode' })
  const s2 = appReducer(s1, { type: 'git-mode-toggle-sync' })
  expect(s2.gitMode.syncScroll).toBe(false)
  expect(s2.gitMode.focusedPane).toBe('after')
  const s3 = appReducer(s2, { type: 'git-mode-toggle-sync' })
  expect(s3.gitMode.syncScroll).toBe(false)
  expect(s3.gitMode.focusedPane).toBe('before')
  const s4 = appReducer(s3, { type: 'git-mode-toggle-sync' })
  expect(s4.gitMode.syncScroll).toBe(true)
})

test('git-mode-set-diff stores diff and clears loading', () => {
  const s0 = seedWithFiles([entry('a.ts')])
  const s1 = appReducer(s0, {
    loading: true,
    path: 'a.ts',
    type: 'git-mode-set-loading',
  })
  expect(s1.gitMode.loading['a.ts']).toBe(true)
  const s2 = appReducer(s1, {
    diff: diff('a.ts', 3),
    path: 'a.ts',
    type: 'git-mode-set-diff',
  })
  expect(s2.gitMode.diffs['a.ts']?.lines).toHaveLength(3)
  expect(s2.gitMode.loading['a.ts']).toBeUndefined()
})
