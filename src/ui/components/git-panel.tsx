import { memo, type ReactNode, useMemo } from 'react'

import type { GitFileEntry, GitFileSection, GitPanelState } from '../../state/types'

import { theme } from '../theme'

interface GitPanelProps {
  gitPanel: GitPanelState
  projectPath: string | undefined
}

const SECTION_ORDER: { key: GitFileSection; title: string }[] = [
  { key: 'staged', title: 'Staged Changes' },
  { key: 'unstaged', title: 'Changes' },
  { key: 'untracked', title: 'Untracked' },
]

const STATUS_COLORS: Record<GitFileEntry['status'], string> = {
  '?': theme.textMuted,
  'A': theme.success,
  'C': theme.accent,
  'D': theme.danger,
  'M': theme.warning,
  'R': theme.accent,
  'U': theme.danger,
}

function groupBySection(files: GitFileEntry[]): Record<GitFileSection, GitFileEntry[]> {
  const groups: Record<GitFileSection, GitFileEntry[]> = {
    staged: [],
    unstaged: [],
    untracked: [],
  }
  for (const file of files) groups[file.section].push(file)
  return groups
}

function maxDigitWidth(files: GitFileEntry[]): { added: number; removed: number } {
  let addedMax = 1
  let removedMax = 1
  for (const f of files) {
    if (f.added !== null) addedMax = Math.max(addedMax, String(f.added).length)
    if (f.removed !== null) removedMax = Math.max(removedMax, String(f.removed).length)
  }
  return { added: addedMax, removed: removedMax }
}

function padRight(value: number | null, width: number): string {
  return String(value ?? 0).padStart(width, ' ')
}

export function splitPath(path: string): { prefix: string; basename: string } {
  const slash = path.lastIndexOf('/')
  if (slash < 0) return { basename: path, prefix: '' }
  return { basename: path.slice(slash + 1), prefix: path.slice(0, slash + 1) }
}

function stripTrailingSlash(prefix: string): string {
  return prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
}

function renderPath(file: GitFileEntry): ReactNode {
  const { basename, prefix } = splitPath(file.path)
  const dir = stripTrailingSlash(prefix)
  if (file.renamedFrom) {
    const renamed = splitPath(file.renamedFrom)
    const renamedDir = stripTrailingSlash(renamed.prefix)
    return (
      <text wrapMode="none">
        <span fg={theme.text}>{renamed.basename}</span>
        {renamedDir ? <span fg={theme.textMuted}> {renamedDir}</span> : null}
        <span fg={theme.textMuted}> → </span>
        <span fg={theme.text}>{basename}</span>
        {dir ? <span fg={theme.textMuted}> {dir}</span> : null}
      </text>
    )
  }
  return (
    <text wrapMode="none">
      <span fg={theme.text}>{basename}</span>
      {dir ? <span fg={theme.textMuted}> {dir}</span> : null}
    </text>
  )
}

function renderFileRow(
  file: GitFileEntry,
  key: string,
  addedW: number,
  removedW: number
): ReactNode {
  const hasNumstat = file.added !== null || file.removed !== null
  return (
    <box key={key} flexDirection="row" gap={1} paddingLeft={1}>
      <text fg={STATUS_COLORS[file.status]}>
        <strong>{file.status}</strong>
      </text>
      <box flexGrow={1} overflow="hidden">
        {renderPath(file)}
      </box>
      {hasNumstat ? (
        <box flexDirection="row" flexShrink={0}>
          <text fg={theme.success}>{`+${padRight(file.added, addedW)}`}</text>
          <text fg={theme.dim}> </text>
          <text fg={theme.danger}>{`−${padRight(file.removed, removedW)}`}</text>
        </box>
      ) : (
        <text fg={theme.textMuted} flexShrink={0}>
          —
        </text>
      )}
    </box>
  )
}

function renderSection(
  section: GitFileSection,
  title: string,
  files: GitFileEntry[],
  addedW: number,
  removedW: number
): ReactNode {
  if (files.length === 0) return null
  return (
    <box key={section} flexDirection="column">
      <text fg={theme.accentAlt}>
        <strong>
          {title} ({files.length})
        </strong>
      </text>
      {files.map((file, i) => renderFileRow(file, `${section}-${i}`, addedW, removedW))}
    </box>
  )
}

function renderStatus(gitPanel: GitPanelState, hasProjectPath: boolean): ReactNode | null {
  if (!hasProjectPath) {
    return <text fg={theme.textMuted}>No active session</text>
  }
  if (gitPanel.error === 'not-a-repo') {
    return <text fg={theme.textMuted}>Not a git repository</text>
  }
  if (gitPanel.error === 'unknown') {
    return <text fg={theme.danger}>Git error</text>
  }
  if (gitPanel.loading && gitPanel.files.length === 0) {
    return <text fg={theme.textMuted}>Loading…</text>
  }
  if (gitPanel.files.length === 0) {
    return <text fg={theme.textMuted}>No changes</text>
  }
  return null
}

export const GitPanel = memo(function GitPanel({ gitPanel, projectPath }: GitPanelProps) {
  const groups = useMemo(() => groupBySection(gitPanel.files), [gitPanel.files])
  const { added: addedW, removed: removedW } = useMemo(
    () => maxDigitWidth(gitPanel.files),
    [gitPanel.files]
  )

  const statusNode = renderStatus(gitPanel, !!projectPath)

  const hasRemoteTracking = gitPanel.ahead > 0 || gitPanel.behind > 0

  return (
    <box flexDirection="column" flexGrow={1} gap={0}>
      {hasRemoteTracking ? (
        <text fg={theme.textMuted}>
          ↑{gitPanel.ahead} ↓{gitPanel.behind}
        </text>
      ) : null}
      {statusNode ? (
        <box>{statusNode}</box>
      ) : (
        <scrollbox
          flexGrow={1}
          scrollY
          viewportCulling
          contentOptions={{ flexDirection: 'column', gap: 0 }}
        >
          {SECTION_ORDER.map((s) => renderSection(s.key, s.title, groups[s.key], addedW, removedW))}
        </scrollbox>
      )}
    </box>
  )
})
