import { $ } from 'bun'

import type {
  GitFileEntry,
  GitFileSection,
  GitFileStatus,
  GitPanelError,
  GitRefreshPayload,
} from '../state/types'

interface NumstatRow {
  added: number | null
  removed: number | null
}

export type GitCollectResult =
  | { kind: 'ok'; payload: GitRefreshPayload }
  | { kind: 'error'; error: GitPanelError }

const STATUS_CODES = new Set(['M', 'A', 'D', 'R', 'C', 'U', '?'])

function toStatus(char: string): GitFileStatus | null {
  return STATUS_CODES.has(char) ? (char as GitFileStatus) : null
}

export function parseBranchLines(output: string): {
  branch: string | null
  ahead: number
  behind: number
} {
  let branch: string | null = null
  let ahead = 0
  let behind = 0
  for (const line of output.split('\n')) {
    if (line.startsWith('# branch.head ')) {
      const head = line.slice('# branch.head '.length).trim()
      branch = head === '(detached)' ? null : head
    } else if (line.startsWith('# branch.ab ')) {
      const rest = line.slice('# branch.ab '.length).trim()
      const match = /^\+(\d+)\s+-(\d+)/.exec(rest)
      if (match) {
        ahead = Number.parseInt(match[1] as string, 10)
        behind = Number.parseInt(match[2] as string, 10)
      }
    }
  }
  return { ahead, behind, branch }
}

export function parseNumstat(output: string): Map<string, NumstatRow> {
  const map = new Map<string, NumstatRow>()
  for (const raw of output.split('\n')) {
    if (!raw) continue
    const parts = raw.split('\t')
    if (parts.length < 3) continue
    const [addedStr, removedStr, ...pathParts] = parts
    const path = pathParts.join('\t')
    if (!path || path.includes('{') || path.includes(' => ')) continue
    const added = addedStr === '-' ? null : Number.parseInt(addedStr ?? '', 10)
    const removed = removedStr === '-' ? null : Number.parseInt(removedStr ?? '', 10)
    map.set(path, {
      added: Number.isNaN(added as number) ? null : added,
      removed: Number.isNaN(removed as number) ? null : removed,
    })
  }
  return map
}

function buildEntry(
  section: GitFileSection,
  status: GitFileStatus,
  path: string,
  numstat: Map<string, NumstatRow>,
  renamedFrom?: string
): GitFileEntry {
  const stats = numstat.get(path)
  let added: number | null
  let removed: number | null
  if (status === '?') {
    added = null
    removed = null
  } else if (stats) {
    added = stats.added
    removed = stats.removed
  } else {
    added = 0
    removed = 0
  }
  const entry: GitFileEntry = { added, path, removed, section, status }
  if (renamedFrom) entry.renamedFrom = renamedFrom
  return entry
}

export function parsePorcelainEntries(
  output: string,
  stagedNumstat: Map<string, NumstatRow>,
  unstagedNumstat: Map<string, NumstatRow>
): GitFileEntry[] {
  const files: GitFileEntry[] = []
  const lines = output.split('\n')
  for (const line of lines) {
    if (!line || line.startsWith('#') || line.startsWith('!')) continue

    if (line.startsWith('? ')) {
      const path = line.slice(2)
      files.push(buildEntry('untracked', '?', path, unstagedNumstat))
      continue
    }

    if (line.startsWith('1 ')) {
      const parts = line.split(' ')
      if (parts.length < 9) continue
      const xy = parts[1] ?? '..'
      const path = parts.slice(8).join(' ')
      const x = toStatus(xy[0] ?? '.')
      const y = toStatus(xy[1] ?? '.')
      if (x) files.push(buildEntry('staged', x, path, stagedNumstat))
      if (y) files.push(buildEntry('unstaged', y, path, unstagedNumstat))
      continue
    }

    if (line.startsWith('2 ')) {
      const parts = line.split(' ')
      if (parts.length < 10) continue
      const xy = parts[1] ?? '..'
      const trailer = parts.slice(9).join(' ')
      const [newPath, origPath] = trailer.split('\t')
      if (!newPath || !origPath) continue
      const x = toStatus(xy[0] ?? '.')
      const y = toStatus(xy[1] ?? '.')
      if (x) {
        files.push(buildEntry('staged', x, newPath, stagedNumstat, origPath))
      }
      if (y) {
        files.push(buildEntry('unstaged', y, newPath, unstagedNumstat, origPath))
      }
      continue
    }

    if (line.startsWith('u ')) {
      const parts = line.split(' ')
      if (parts.length < 11) continue
      const path = parts.slice(10).join(' ')
      files.push(buildEntry('unstaged', 'U', path, unstagedNumstat))
    }
  }
  return files
}

export async function collectGitStatus(cwd: string): Promise<GitCollectResult> {
  try {
    const [statusResult, unstagedDiff, stagedDiff] = await Promise.all([
      $`git -C ${cwd} status --porcelain=v2 -b --untracked-files=all`.quiet().nothrow(),
      $`git -C ${cwd} diff --numstat`.quiet().nothrow(),
      $`git -C ${cwd} diff --cached --numstat`.quiet().nothrow(),
    ])

    if (statusResult.exitCode !== 0) {
      return { error: 'not-a-repo', kind: 'error' }
    }

    const statusText = statusResult.text()
    const { ahead, behind, branch } = parseBranchLines(statusText)
    const unstagedNumstat = parseNumstat(unstagedDiff.text())
    const stagedNumstat = parseNumstat(stagedDiff.text())
    const files = parsePorcelainEntries(statusText, stagedNumstat, unstagedNumstat)

    return { kind: 'ok', payload: { ahead, behind, branch, files } }
  } catch {
    return { error: 'unknown', kind: 'error' }
  }
}
