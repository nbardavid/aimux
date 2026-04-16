import { memo, useEffect } from 'react'

import type { DiffData } from '../../state/types'

import { fetchDiff } from '../../git/git-diff'
import { useGitPanelPolling } from '../../git/git-poller'
import { useAppStore } from '../../state/app-store'
import { dispatchGlobal } from '../../state/dispatch-ref'
import { theme } from '../theme'
import { GitPanel } from './git-panel'

function filetypeFromPath(path: string): string | undefined {
  const dot = path.lastIndexOf('.')
  if (dot < 0) return undefined
  const ext = path.slice(dot + 1).toLowerCase()
  const map: Record<string, string> = {
    c: 'c',
    cjs: 'javascript',
    cpp: 'cpp',
    cs: 'csharp',
    css: 'css',
    go: 'go',
    h: 'c',
    hpp: 'cpp',
    html: 'html',
    java: 'java',
    js: 'javascript',
    json: 'json',
    jsx: 'jsx',
    kt: 'kotlin',
    lua: 'lua',
    md: 'markdown',
    mjs: 'javascript',
    php: 'php',
    py: 'python',
    rb: 'ruby',
    rs: 'rust',
    sh: 'bash',
    swift: 'swift',
    ts: 'typescript',
    tsx: 'tsx',
    vue: 'vue',
    yaml: 'yaml',
    yml: 'yaml',
    zig: 'zig',
  }
  return map[ext]
}

interface DiffStageProps {
  diff: DiffData | undefined
  loading: boolean
  syncScroll: boolean
}

function placeholderText(diff: DiffData): string | null {
  if (diff.status === 'binary') {
    const before = diff.binarySizeBefore ?? 0
    const after = diff.binarySizeAfter ?? 0
    return `(binary file — ${before} → ${after} bytes)`
  }
  if (diff.rawDiff.length === 0) {
    if (diff.status === 'new') return '(new file — no diff)'
    if (diff.status === 'deleted') return '(deleted — no diff)'
    return '(no changes)'
  }
  return null
}

const DiffStage = memo(function DiffStage({ diff, loading, syncScroll }: DiffStageProps) {
  if (loading && !diff) {
    return (
      <box flexGrow={1} padding={1}>
        <text fg={theme.textMuted}>Loading diff…</text>
      </box>
    )
  }
  if (!diff) {
    return (
      <box flexGrow={1} padding={1}>
        <text fg={theme.textMuted}>Select a file.</text>
      </box>
    )
  }
  if (diff.errorMessage) {
    return (
      <box flexGrow={1} padding={1}>
        <text fg={theme.danger}>{diff.errorMessage}</text>
      </box>
    )
  }

  const placeholder = placeholderText(diff)
  if (placeholder) {
    return (
      <box flexGrow={1} padding={1}>
        <text fg={theme.textMuted}>{placeholder}</text>
      </box>
    )
  }

  const filetype = filetypeFromPath(diff.path)

  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden">
      {diff.oldPath ? (
        <box paddingLeft={1} paddingRight={1}>
          <text fg={theme.textMuted}>
            renamed: {diff.oldPath} → {diff.path}
          </text>
        </box>
      ) : null}
      <diff
        diff={diff.rawDiff}
        view="split"
        syncScroll={syncScroll}
        showLineNumbers
        wrapMode="none"
        filetype={filetype}
        addedBg={theme.diffAddBg}
        removedBg={theme.diffRemoveBg}
        addedSignColor={theme.success}
        removedSignColor={theme.danger}
        flexGrow={1}
      />
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

  const footerLine = 'j/k next/prev file · Tab toggle sync · mouse wheel scroll · Esc exit'

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
        <DiffStage diff={diff} loading={loading} syncScroll={gitMode.syncScroll} />
      </box>
      <box paddingLeft={1} paddingRight={1} backgroundColor={theme.panel}>
        <text fg={theme.textMuted}>{footerLine}</text>
      </box>
    </box>
  )
})
