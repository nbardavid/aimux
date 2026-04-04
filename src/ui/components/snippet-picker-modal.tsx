import type { SnippetRecord } from '../../state/types'

import { filterSnippets } from '../../state/selectors'
import { theme } from '../theme'

interface SnippetPickerModalProps {
  snippets: SnippetRecord[]
  selectedIndex: number
  filter: string | null
}

const MAX_PREVIEW_LENGTH = 60

function truncateContent(content: string): string {
  if (content.length <= MAX_PREVIEW_LENGTH) return content
  return `${content.slice(0, MAX_PREVIEW_LENGTH - 3)}...`
}

export function SnippetPickerModal({ filter, selectedIndex, snippets }: SnippetPickerModalProps) {
  const filtered = filterSnippets(snippets, filter)

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
        <text fg={theme.accent}>Snippets</text>
        <text fg={theme.textMuted}>
          j/k move, Enter send, n new, e edit, d delete, / filter, Esc cancel.
        </text>
        {filter !== null ? (
          <box
            backgroundColor={theme.panelMuted}
            borderColor={theme.borderActive}
            padding={1}
            border
          >
            <text fg={theme.text}>/{filter}_</text>
          </box>
        ) : null}
        {filtered.length === 0 ? (
          <box padding={1}>
            <text fg={theme.textMuted}>
              {filter ? 'No matching snippets.' : 'No snippets yet. Press n to create one.'}
            </text>
          </box>
        ) : null}
        {filtered.map((snippet, index) => {
          const active = index === selectedIndex
          return (
            <box
              backgroundColor={active ? theme.panelMuted : theme.background}
              borderColor={active ? theme.borderActive : theme.border}
              flexDirection="column"
              key={snippet.id}
              padding={1}
              border
            >
              <text fg={active ? theme.text : theme.textMuted}>
                {active ? '>' : ' '} {snippet.name}
              </text>
              <text fg={theme.textMuted}> {truncateContent(snippet.content)}</text>
            </box>
          )
        })}
      </box>
    </box>
  )
}
