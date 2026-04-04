import type { DirectoryResult } from '../../state/types'

import { abbreviatePath } from '../path-format'
import { theme } from '../theme'

const MODAL_WIDTH = '60%'

function getDirectoryResultIcon(result: DirectoryResult): string {
  if (result.type === 'worktree') {
    return '\u{e728}'
  }

  if (result.type === 'workspace') {
    return '\u{f07c}'
  }

  return '\u{e702}'
}

function getDirectoryResultColor(result: DirectoryResult): string {
  if (result.type === 'worktree') {
    return theme.warning
  }

  if (result.type === 'workspace') {
    return theme.accentAlt
  }

  return theme.accent
}

interface CreateSessionModalProps {
  activeField: 'directory' | 'name'
  directoryQuery: string
  sessionName: string
  results: DirectoryResult[]
  selectedIndex: number
  pendingProjectPath: string | null
}

export function CreateSessionModal({
  activeField,
  directoryQuery,
  pendingProjectPath,
  results,
  selectedIndex,
  sessionName,
}: CreateSessionModalProps) {
  const dirActive = activeField === 'directory'
  const nameActive = activeField === 'name'

  return (
    <box
      justifyContent="center"
      alignItems="center"
      position="absolute"
      height="100%"
      width="100%"
      left={0}
      top={0}
    >
      <box
        borderColor={theme.borderActive}
        backgroundColor={theme.panel}
        flexDirection="column"
        width={MODAL_WIDTH}
        padding={1}
        gap={1}
        border
      >
        <text fg={theme.accentAlt}>Create session</text>
        <text fg={theme.textMuted}>Tab switch field. Ctrl+n/p nav. Esc cancel.</text>

        <text fg={dirActive ? theme.text : theme.textMuted}>Search projects:</text>
        <box
          backgroundColor={dirActive ? theme.panelMuted : theme.background}
          borderColor={dirActive ? theme.borderActive : theme.border}
          padding={1}
          border
        >
          <text fg={dirActive ? theme.text : theme.textMuted}>
            {pendingProjectPath && !dirActive ? abbreviatePath(pendingProjectPath) : directoryQuery}
            {dirActive ? '_' : ''}
          </text>
        </box>

        {dirActive && results.length === 0 && directoryQuery.length > 0 ? (
          <text fg={theme.textMuted}>No matches</text>
        ) : null}
        {dirActive
          ? results.map((result, index) => {
              const active = index === selectedIndex
              return (
                <box flexDirection="row" key={result.path}>
                  <text fg={active ? theme.text : theme.textMuted}>{active ? '>' : ' '} </text>
                  <text fg={getDirectoryResultColor(result)}>
                    {getDirectoryResultIcon(result)}{' '}
                  </text>
                  <text fg={active ? theme.text : theme.textMuted}>
                    {abbreviatePath(result.path)}
                  </text>
                </box>
              )
            })
          : null}

        <text fg={nameActive ? theme.text : theme.textMuted}>Session name:</text>
        <box
          backgroundColor={nameActive ? theme.panelMuted : theme.background}
          borderColor={nameActive ? theme.borderActive : theme.border}
          padding={1}
          border
        >
          <text fg={nameActive ? theme.text : theme.textMuted}>
            {sessionName}
            {nameActive ? '_' : ''}
          </text>
        </box>
      </box>
    </box>
  )
}
