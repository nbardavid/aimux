import { memo, useEffect, useMemo } from 'react'

import type { DiffData, DiffLine, GitModeState } from '../../state/types'

import { fetchDiff } from '../../git/git-diff'
import { useGitPanelPolling } from '../../git/git-poller'
import { useAppStore } from '../../state/app-store'
import { dispatchGlobal } from '../../state/dispatch-ref'
import { theme } from '../theme'
import { GitPanel } from './git-panel'

const PAGE_OVERHEAD = 4

function formatLineNumber(value: number | null, width: number): string {
  if (value === null) return ' '.repeat(width)
  return String(value).padStart(width, ' ')
}

function paneScroll(gitMode: GitModeState, side: 'before' | 'after'): number {
  if (gitMode.syncScroll) return gitMode.scrollOffset
  return side === 'before' ? gitMode.beforeScrollOffset : gitMode.afterScrollOffset
}

interface DiffPaneProps {
  side: 'before' | 'after'
  diff: DiffData | undefined
  loading: boolean
  scrollOffset: number
  focused: boolean
  syncScroll: boolean
  title: string
}

function emptyDiffPlaceholder(diff: DiffData | undefined, side: 'before' | 'after'): string | null {
  if (!diff) return null
  if (diff.status === 'new' && side === 'before') return '(new file)'
  if (diff.status === 'deleted' && side === 'after') return '(deleted)'
  if (diff.status === 'binary') {
    const size = side === 'before' ? diff.binarySizeBefore : diff.binarySizeAfter
    return `(binary file — ${size ?? 0} bytes)`
  }
  return null
}

function visibleLinesForSide(
  diff: DiffData,
  side: 'before' | 'after',
  scroll: number,
  maxRows: number
): DiffLine[] {
  const filtered = diff.lines.filter((line) => {
    if (side === 'before') return line.kind !== 'added'
    return line.kind !== 'removed'
  })
  return filtered.slice(scroll, scroll + maxRows)
}

const DiffPane = memo(function DiffPane({
  diff,
  focused,
  loading,
  scrollOffset,
  side,
  syncScroll,
  title,
}: DiffPaneProps) {
  const placeholder = emptyDiffPlaceholder(diff, side)
  const borderColor = focused && !syncScroll ? theme.borderActive : theme.border
  const lineNumberWidth = useMemo(() => {
    if (!diff) return 1
    const maxBefore = diff.beforeLineCount
    const maxAfter = diff.afterLineCount
    const max = Math.max(maxBefore, maxAfter, 1)
    return String(max).length
  }, [diff])

  let body: React.ReactNode
  if (loading && !diff) {
    body = (
      <box padding={1}>
        <text fg={theme.textMuted}>Loading diff…</text>
      </box>
    )
  } else if (!diff) {
    body = (
      <box padding={1}>
        <text fg={theme.textMuted}>No diff selected.</text>
      </box>
    )
  } else if (diff.errorMessage) {
    body = (
      <box padding={1}>
        <text fg={theme.danger}>{diff.errorMessage}</text>
      </box>
    )
  } else if (placeholder) {
    body = (
      <box padding={1}>
        <text fg={theme.textMuted}>{placeholder}</text>
      </box>
    )
  } else {
    body = (
      <box flexDirection="column" flexGrow={1} overflow="hidden">
        <DiffLines
          diff={diff}
          side={side}
          scroll={scrollOffset}
          lineNumberWidth={lineNumberWidth}
        />
      </box>
    )
  }

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      flexBasis={0}
      overflow="hidden"
      border
      borderColor={borderColor}
      backgroundColor={theme.background}
    >
      <box paddingLeft={1} paddingRight={1}>
        <text fg={theme.accentAlt}>
          <strong>{title}</strong>
        </text>
        {diff?.oldPath && side === 'before' ? (
          <text fg={theme.textMuted}> renamed from {diff.oldPath}</text>
        ) : null}
      </box>
      {body}
    </box>
  )
})

interface DiffLinesProps {
  diff: DiffData
  side: 'before' | 'after'
  scroll: number
  lineNumberWidth: number
}

const DiffLines = memo(function DiffLines({ diff, lineNumberWidth, scroll, side }: DiffLinesProps) {
  const MAX_VISIBLE = 200
  const visible = useMemo(
    () => visibleLinesForSide(diff, side, scroll, MAX_VISIBLE),
    [diff, side, scroll]
  )
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden">
      {visible.map((line, index) => {
        let bg: string | undefined
        if (line.kind === 'added') bg = theme.diffAddBg
        else if (line.kind === 'removed') bg = theme.diffRemoveBg
        const lineNumber =
          side === 'before'
            ? formatLineNumber(line.lineNumberBefore, lineNumberWidth)
            : formatLineNumber(line.lineNumberAfter, lineNumberWidth)
        let prefix = ' '
        if (line.kind === 'added') prefix = '+'
        else if (line.kind === 'removed') prefix = '-'
        return (
          <box key={index} flexDirection="row" backgroundColor={bg} overflow="hidden">
            <text fg={theme.textMuted} bg={bg}>
              {` ${lineNumber} `}
            </text>
            <text fg={theme.dim} bg={bg}>
              {prefix}
            </text>
            <text fg={theme.text} bg={bg}>
              {' '}
              {line.text}
            </text>
          </box>
        )
      })}
    </box>
  )
})

export const GitView = memo(function GitView() {
  const sidebarWidth = useAppStore((s) => s.sidebar.width)
  const gitPanel = useAppStore((s) => s.gitPanel)
  const gitMode = useAppStore((s) => s.gitMode)
  const currentSessionId = useAppStore((s) => s.currentSessionId)
  const sessions = useAppStore((s) => s.sessions)
  const focusMode = useAppStore((s) => s.focusMode)

  const currentSession = currentSessionId
    ? sessions.find((s) => s.id === currentSessionId)
    : undefined
  const projectPath = currentSession?.projectPath

  useGitPanelPolling({ enabled: focusMode === 'git', projectPath })

  const selectedFile = gitPanel.files[gitMode.selectedFileIndex]
  const diff = selectedFile ? gitMode.diffs[selectedFile.path] : undefined
  const loading = selectedFile ? !!gitMode.loading[selectedFile.path] : false

  useEffect(() => {
    if (focusMode !== 'git') return
    if (!selectedFile || !projectPath) return
    const path = selectedFile.path
    if (diff || loading) return
    dispatchGlobal({ loading: true, path, type: 'git-mode-set-loading' })
    void fetchDiff(projectPath, selectedFile)
      .then((d) => dispatchGlobal({ diff: d, path, type: 'git-mode-set-diff' }))
      .catch(() => dispatchGlobal({ loading: false, path, type: 'git-mode-set-loading' }))
  }, [focusMode, projectPath, selectedFile, diff, loading])
  const beforeScroll = paneScroll(gitMode, 'before')
  const afterScroll = paneScroll(gitMode, 'after')

  const footerLines = ['j/k next/prev · ↓/↑ scroll · Ctrl+d/u page · Tab split · Esc exit']

  return (
    <box flexDirection="column" flexGrow={1}>
      <box flexDirection="row" flexGrow={1}>
        <box
          width={sidebarWidth}
          flexDirection="column"
          backgroundColor={theme.panel}
          padding={0}
          gap={0}
        >
          <text fg={theme.accent}>
            <strong>aimux · git</strong>
          </text>
          {gitPanel.branch ? (
            <box flexDirection="row">
              <text fg={theme.accent}>{'\u{e702}'} </text>
              <text fg={theme.textMuted}>{gitPanel.branch}</text>
            </box>
          ) : null}
          <text fg={theme.dim}>{'·'.repeat(Math.max(0, sidebarWidth - 2))}</text>
          <GitPanel
            gitPanel={gitPanel}
            projectPath={projectPath}
            selectedFilePath={selectedFile?.path ?? null}
          />
        </box>
        <box flexDirection="row" flexGrow={1} overflow="hidden">
          <DiffPane
            side="before"
            diff={diff}
            loading={loading}
            scrollOffset={beforeScroll}
            focused={gitMode.focusedPane === 'before'}
            syncScroll={gitMode.syncScroll}
            title="BEFORE (HEAD)"
          />
          <DiffPane
            side="after"
            diff={diff}
            loading={loading}
            scrollOffset={afterScroll}
            focused={gitMode.focusedPane === 'after'}
            syncScroll={gitMode.syncScroll}
            title="AFTER (working)"
          />
        </box>
      </box>
      <box paddingLeft={1} paddingRight={1} backgroundColor={theme.panel}>
        <text fg={theme.textMuted}>{footerLines[0]}</text>
      </box>
    </box>
  )
})

export const GIT_VIEW_PAGE_OVERHEAD = PAGE_OVERHEAD
