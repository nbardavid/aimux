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

test('parsePorcelainEntries handles deletions with numstat', () => {
  const output = '1 .D N... 100644 100644 000000 abc abc old.ts\n'
  const numstat = new Map([['old.ts', { added: 0, removed: 45 }]])
  const entries = parsePorcelainEntries(output, new Map(), numstat)
  expect(entries[0]).toMatchObject({
    added: 0,
    path: 'old.ts',
    removed: 45,
    section: 'unstaged',
    status: 'D',
  })
})

test('parsePorcelainEntries defaults missing numstat to zero (non-untracked)', () => {
  const output = '1 .M N... 100644 100644 100644 abc abc mode-only.ts\n'
  const entries = parsePorcelainEntries(output, new Map(), new Map())
  expect(entries[0]).toMatchObject({
    added: 0,
    path: 'mode-only.ts',
    removed: 0,
    status: 'M',
  })
})

test('parsePorcelainEntries handles rename entries', () => {
  const output = '2 R. N... 100644 100644 100644 abc def R100 new.ts\told.ts\n'
  const entries = parsePorcelainEntries(output, new Map(), new Map())
  expect(entries).toHaveLength(1)
  expect(entries[0]).toEqual({
    added: 0,
    path: 'new.ts',
    removed: 0,
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

test('parsePorcelainEntries handles ordinary path containing a space', () => {
  const output = '1 .M N... 100644 100644 100644 abc abc src/my file.ts\n'
  const numstat = new Map([['src/my file.ts', { added: 1, removed: 0 }]])
  const entries = parsePorcelainEntries(output, new Map(), numstat)
  expect(entries).toHaveLength(1)
  expect(entries[0]).toMatchObject({
    added: 1,
    path: 'src/my file.ts',
    removed: 0,
    status: 'M',
  })
})

test('parsePorcelainEntries handles rename whose paths contain spaces', () => {
  const output = '2 R. N... 100644 100644 100644 abc def R100 new name.ts\told name.ts\n'
  const entries = parsePorcelainEntries(output, new Map(), new Map())
  expect(entries).toHaveLength(1)
  expect(entries[0]).toMatchObject({
    path: 'new name.ts',
    renamedFrom: 'old name.ts',
    section: 'staged',
    status: 'R',
  })
})

test('parsePorcelainEntries handles copied files (C)', () => {
  const output = '2 C. N... 100644 100644 100644 abc def C100 copy.ts\torig.ts\n'
  const entries = parsePorcelainEntries(output, new Map(), new Map())
  expect(entries).toHaveLength(1)
  expect(entries[0]).toMatchObject({
    path: 'copy.ts',
    renamedFrom: 'orig.ts',
    section: 'staged',
    status: 'C',
  })
})

test('parsePorcelainEntries handles submodule ordinary entries', () => {
  const output = '1 .M SCMU 160000 160000 160000 abc abc vendor/sub\n'
  const entries = parsePorcelainEntries(output, new Map(), new Map())
  expect(entries).toHaveLength(1)
  expect(entries[0]).toMatchObject({
    path: 'vendor/sub',
    section: 'unstaged',
    status: 'M',
  })
})
