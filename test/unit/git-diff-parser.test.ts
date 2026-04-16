import { expect, test } from 'bun:test'

import { parseUnifiedDiff } from '../../src/git/git-diff'

test('parseUnifiedDiff parses modified file with context + adds + removes', () => {
  const diff = [
    'diff --git a/foo.ts b/foo.ts',
    'index abc..def 100644',
    '--- a/foo.ts',
    '+++ b/foo.ts',
    '@@ -1,4 +1,4 @@',
    ' line1',
    '-old',
    '+new',
    ' line3',
    ' line4',
    '',
  ].join('\n')
  const result = parseUnifiedDiff(diff, { path: 'foo.ts', status: 'modified' })
  expect(result.lines).toHaveLength(5)
  expect(result.lines[0]).toMatchObject({
    kind: 'context',
    lineNumberAfter: 1,
    lineNumberBefore: 1,
    text: 'line1',
  })
  expect(result.lines[1]).toMatchObject({
    kind: 'removed',
    lineNumberAfter: null,
    lineNumberBefore: 2,
    text: 'old',
  })
  expect(result.lines[2]).toMatchObject({
    kind: 'added',
    lineNumberAfter: 2,
    lineNumberBefore: null,
    text: 'new',
  })
  expect(result.beforeLineCount).toBe(4)
  expect(result.afterLineCount).toBe(4)
})

test('parseUnifiedDiff ignores header lines and no-newline markers', () => {
  const diff = [
    'diff --git a/f b/f',
    '--- a/f',
    '+++ b/f',
    '@@ -1,1 +1,1 @@',
    '-a',
    '+b',
    '\\ No newline at end of file',
    '',
  ].join('\n')
  const result = parseUnifiedDiff(diff, { path: 'f', status: 'modified' })
  expect(result.lines).toHaveLength(2)
  expect(result.lines[0]?.kind).toBe('removed')
  expect(result.lines[1]?.kind).toBe('added')
})

test('parseUnifiedDiff preserves oldPath for rename', () => {
  const diff = ['@@ -1,1 +1,1 @@', '-a', '+b', ''].join('\n')
  const result = parseUnifiedDiff(diff, { oldPath: 'old.ts', path: 'new.ts', status: 'renamed' })
  expect(result.oldPath).toBe('old.ts')
  expect(result.status).toBe('renamed')
})

test('parseUnifiedDiff handles empty diff output', () => {
  const result = parseUnifiedDiff('', { path: 'f', status: 'modified' })
  expect(result.lines).toHaveLength(0)
  expect(result.beforeLineCount).toBe(0)
  expect(result.afterLineCount).toBe(0)
})

test('parseUnifiedDiff handles multiple hunks with distinct line numbers', () => {
  const diff = [
    '@@ -10,2 +10,2 @@',
    ' keep10',
    '-old11',
    '+new11',
    '@@ -20,2 +20,2 @@',
    ' keep20',
    '-old21',
    '+new21',
    '',
  ].join('\n')
  const result = parseUnifiedDiff(diff, { path: 'f', status: 'modified' })
  const firstRemoved = result.lines.find((l) => l.kind === 'removed' && l.lineNumberBefore === 11)
  expect(firstRemoved?.text).toBe('old11')
  const secondRemoved = result.lines.find((l) => l.kind === 'removed' && l.lineNumberBefore === 21)
  expect(secondRemoved?.text).toBe('old21')
})
