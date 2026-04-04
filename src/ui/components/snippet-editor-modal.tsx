import { theme } from '../theme'

interface SnippetEditorModalProps {
  activeField: 'name' | 'content'
  snippetName: string
  snippetContent: string
  isEditing: boolean
}

export function SnippetEditorModal({
  activeField,
  isEditing,
  snippetContent,
  snippetName,
}: SnippetEditorModalProps) {
  const nameActive = activeField === 'name'
  const contentActive = activeField === 'content'

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
        padding={1}
        width="60%"
        gap={1}
        border
      >
        <text fg={theme.accent}>{isEditing ? 'Edit snippet' : 'Create snippet'}</text>
        <text fg={theme.textMuted}>Tab switch field. Enter on content to save. Esc cancel.</text>

        <text fg={nameActive ? theme.text : theme.textMuted}>Name:</text>
        <box
          backgroundColor={nameActive ? theme.panelMuted : theme.background}
          borderColor={nameActive ? theme.borderActive : theme.border}
          padding={1}
          border
        >
          <text fg={nameActive ? theme.text : theme.textMuted}>
            {snippetName}
            {nameActive ? '_' : ''}
          </text>
        </box>

        <text fg={contentActive ? theme.text : theme.textMuted}>Content:</text>
        <box
          backgroundColor={contentActive ? theme.panelMuted : theme.background}
          borderColor={contentActive ? theme.borderActive : theme.border}
          padding={1}
          border
        >
          <text fg={contentActive ? theme.text : theme.textMuted}>
            {snippetContent}
            {contentActive ? '_' : ''}
          </text>
        </box>
      </box>
    </box>
  )
}
