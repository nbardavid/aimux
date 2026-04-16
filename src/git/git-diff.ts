import { $ } from 'bun'

import type { DiffData, DiffFileStatus, DiffLine, GitFileEntry } from '../state/types'

interface ParseOptions {
  status: DiffFileStatus
  path: string
  oldPath?: string
}

export function parseUnifiedDiff(diffText: string, options: ParseOptions): DiffData {
  const lines: DiffLine[] = []
  let beforeLine = 0
  let afterLine = 0
  let beforeCount = 0
  let afterCount = 0
  let inHunk = false

  const rawLines = diffText.split('\n')
  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i] ?? ''

    if (raw.startsWith('@@')) {
      const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw)
      if (match) {
        beforeLine = Number.parseInt(match[1] ?? '1', 10)
        afterLine = Number.parseInt(match[2] ?? '1', 10)
        inHunk = true
      }
      continue
    }

    if (!inHunk) continue
    if (raw.startsWith('\\ ')) continue

    if (raw.startsWith('+')) {
      lines.push({
        kind: 'added',
        lineNumberAfter: afterLine,
        lineNumberBefore: null,
        text: raw.slice(1),
      })
      afterLine++
      afterCount++
      continue
    }

    if (raw.startsWith('-')) {
      lines.push({
        kind: 'removed',
        lineNumberAfter: null,
        lineNumberBefore: beforeLine,
        text: raw.slice(1),
      })
      beforeLine++
      beforeCount++
      continue
    }

    if (raw.startsWith(' ')) {
      lines.push({
        kind: 'context',
        lineNumberAfter: afterLine,
        lineNumberBefore: beforeLine,
        text: raw.slice(1),
      })
      beforeLine++
      afterLine++
      beforeCount++
      afterCount++
      continue
    }
  }

  const result: DiffData = {
    afterLineCount: afterCount,
    beforeLineCount: beforeCount,
    lines,
    path: options.path,
    status: options.status,
  }
  if (options.oldPath) result.oldPath = options.oldPath
  return result
}

function entriesForPath(path: string, files: GitFileEntry[]): GitFileEntry[] {
  return files.filter((f) => f.path === path)
}

function resolveStatus(entries: GitFileEntry[]): { status: DiffFileStatus; oldPath?: string } {
  if (entries.length === 0) return { status: 'modified' }
  for (const entry of entries) {
    if (entry.renamedFrom) return { oldPath: entry.renamedFrom, status: 'renamed' }
  }
  const isUntracked = entries.every((e) => e.section === 'untracked' || e.status === '?')
  if (isUntracked) return { status: 'new' }
  const allDeleted = entries.every((e) => e.status === 'D')
  if (allDeleted) return { status: 'deleted' }
  const hasAdded = entries.some((e) => e.status === 'A')
  const hasOnlyStaged = entries.every((e) => e.section === 'staged')
  if (hasAdded && hasOnlyStaged) return { status: 'new' }
  return { status: 'modified' }
}

async function readWorkingFile(cwd: string, path: string): Promise<string> {
  try {
    const file = Bun.file(`${cwd}/${path}`)
    if (await file.exists()) {
      return await file.text()
    }
  } catch {}
  return ''
}

async function readHeadFile(cwd: string, path: string): Promise<string | null> {
  const result = await $`git -C ${cwd} show HEAD:${path}`.quiet().nothrow()
  if (result.exitCode !== 0) return null
  return result.text()
}

function contentToLines(
  content: string,
  kind: 'added' | 'removed' | 'context'
): { lines: DiffLine[]; count: number } {
  const pieces = content.split('\n')
  if (pieces.length > 0 && pieces[pieces.length - 1] === '') pieces.pop()
  const lines: DiffLine[] = []
  for (let i = 0; i < pieces.length; i++) {
    const lineNum = i + 1
    lines.push({
      kind,
      lineNumberAfter: kind === 'removed' ? null : lineNum,
      lineNumberBefore: kind === 'added' ? null : lineNum,
      text: pieces[i] ?? '',
    })
  }
  return { count: pieces.length, lines }
}

async function isBinary(cwd: string, path: string): Promise<boolean> {
  const result = await $`git -C ${cwd} diff HEAD --numstat -- ${path}`.quiet().nothrow()
  if (result.exitCode !== 0) return false
  const text = result.text().trim()
  if (!text) return false
  const first = text.split('\n')[0] ?? ''
  return first.startsWith('-\t-\t')
}

export async function fetchDiff(cwd: string, file: GitFileEntry): Promise<DiffData> {
  const allEntriesForPath = [file]
  const { oldPath, status } = resolveStatus(entriesForPath(file.path, allEntriesForPath))

  if (status === 'new') {
    const content = await readWorkingFile(cwd, file.path)
    const { count, lines } = contentToLines(content, 'added')
    return {
      afterLineCount: count,
      beforeLineCount: 0,
      lines,
      path: file.path,
      status: 'new',
    }
  }

  if (status === 'deleted') {
    const head = (await readHeadFile(cwd, file.path)) ?? ''
    const { count, lines } = contentToLines(head, 'removed')
    return {
      afterLineCount: 0,
      beforeLineCount: count,
      lines,
      path: file.path,
      status: 'deleted',
    }
  }

  if (await isBinary(cwd, file.path)) {
    let binarySizeBefore = 0
    let binarySizeAfter = 0
    try {
      const head = await readHeadFile(cwd, file.path)
      binarySizeBefore = head ? head.length : 0
    } catch {}
    try {
      const bunFile = Bun.file(`${cwd}/${file.path}`)
      if (await bunFile.exists()) binarySizeAfter = bunFile.size
    } catch {}
    return {
      afterLineCount: 0,
      beforeLineCount: 0,
      binarySizeAfter,
      binarySizeBefore,
      lines: [],
      path: file.path,
      status: 'binary',
    }
  }

  const diffResult = await $`git -C ${cwd} diff HEAD --unified=99999 --no-color -- ${file.path}`
    .quiet()
    .nothrow()

  if (diffResult.exitCode !== 0) {
    return {
      afterLineCount: 0,
      beforeLineCount: 0,
      errorMessage: `git diff failed (exit ${diffResult.exitCode})`,
      lines: [],
      path: file.path,
      status,
    }
  }

  const parsed = parseUnifiedDiff(diffResult.text(), {
    oldPath,
    path: file.path,
    status,
  })
  return parsed
}
