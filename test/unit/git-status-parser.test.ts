import { expect, test } from 'bun:test'

import { parseBranchLines, parseNumstat, parsePorcelainEntries } from '../../src/git/git-status'

test('parseBranchLines extracts branch + ahead/behind', () => {
  const output = [
    '# branch.oid abc123',
    '# branch.head main',
    '# branch.upstream origin/main',
    '# branch.ab +2 -1',
  ].join('\n')
  expect(parseBranchLines(output)).toEqual({ ahead: 2, behind: 1, branch: 'main' })
})

test('parseBranchLines handles detached head', () => {
  const output = '# branch.head (detached)\n'
  expect(parseBranchLines(output).branch).toBeNull()
})

test('parseBranchLines handles missing ab line', () => {
  const output = '# branch.head feature/x\n'
  expect(parseBranchLines(output)).toEqual({ ahead: 0, behind: 0, branch: 'feature/x' })
})

test('parseNumstat extracts counts by path', () => {
  const output = '5\t2\tsrc/a.ts\n-\t-\timage.png\n\n0\t42\tdeleted.ts\n'
  const map = parseNumstat(output)
  expect(map.get('src/a.ts')).toEqual({ added: 5, removed: 2 })
  expect(map.get('image.png')).toEqual({ added: null, removed: null })
  expect(map.get('deleted.ts')).toEqual({ added: 0, removed: 42 })
})

test('parseNumstat skips rename notation paths', () => {
  const output = '3\t3\t{old => new}/file.ts\n1\t0\told => new/file.ts\n'
  const map = parseNumstat(output)
  expect(map.size).toBe(0)
})

test('parsePorcelainEntries handles modified unstaged (ordinary)', () => {
  const output = '1 .M N... 100644 100644 100644 abc abc src/a.ts\n'
  const numstat = new Map([['src/a.ts', { added: 5, removed: 2 }]])
  const entries = parsePorcelainEntries(output, new Map(), numstat)
  expect(entries).toHaveLength(1)
  expect(entries[0]).toEqual({
    added: 5,
    path: 'src/a.ts',
    removed: 2,
    section: 'unstaged',
    status: 'M',
  })
})

test('parsePorcelainEntries handles staged + unstaged modification (MM)', () => {
  const output = '1 MM N... 100644 100644 100644 abc def src/a.ts\n'
  const staged = new Map([['src/a.ts', { added: 3, removed: 1 }]])
  const unstaged = new Map([['src/a.ts', { added: 2, removed: 0 }]])
  const entries = parsePorcelainEntries(output, staged, unstaged)
  expect(entries).toHaveLength(2)
  expect(entries.find((e) => e.section === 'staged')).toMatchObject({
    added: 3,
    path: 'src/a.ts',
    removed: 1,
    status: 'M',
  })
  expect(entries.find((e) => e.section === 'unstaged')).toMatchObject({
    added: 2,
    path: 'src/a.ts',
    removed: 0,
    status: 'M',
  })
})

test('parsePorcelainEntries handles deletions', () => {
  const output = '1 .D N... 100644 100644 000000 abc abc old.ts\n'
  const entries = parsePorcelainEntries(output, new Map(), new Map())
  expect(entries[0]).toMatchObject({
    added: null,
    path: 'old.ts',
    removed: null,
    section: 'unstaged',
    status: 'D',
  })
})

test('parsePorcelainEntries handles rename entries', () => {
  const output = '2 R. N... 100644 100644 100644 abc def R100 new.ts\told.ts\n'
  const entries = parsePorcelainEntries(output, new Map(), new Map())
  expect(entries).toHaveLength(1)
  expect(entries[0]).toEqual({
    added: null,
    path: 'new.ts',
    removed: null,
    renamedFrom: 'old.ts',
    section: 'staged',
    status: 'R',
  })
})

test('parsePorcelainEntries handles untracked files', () => {
  const output = '? tmp/draft.txt\n? another.md\n'
  const entries = parsePorcelainEntries(output, new Map(), new Map())
  expect(entries).toHaveLength(2)
  expect(entries[0]).toMatchObject({
    path: 'tmp/draft.txt',
    section: 'untracked',
    status: '?',
  })
  expect(entries[0]?.added).toBeNull()
})

test('parsePorcelainEntries handles unmerged', () => {
  const output = 'u UU N... 100644 100644 100644 100644 abc def ghi conflict.ts\n'
  const entries = parsePorcelainEntries(output, new Map(), new Map())
  expect(entries[0]).toMatchObject({
    path: 'conflict.ts',
    section: 'unstaged',
    status: 'U',
  })
})

test('parsePorcelainEntries skips ignored and comments', () => {
  const output = '# branch.head main\n! ignored.log\n? real.txt\n'
  const entries = parsePorcelainEntries(output, new Map(), new Map())
  expect(entries).toHaveLength(1)
  expect(entries[0]?.path).toBe('real.txt')
})
