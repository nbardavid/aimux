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
  const normalized = content.replaceAll(/\s+/g, ' ').trim()
  if (normalized.length <= MAX_PREVIEW_LENGTH) return normalized
  return `${normalized.slice(0, MAX_PREVIEW_LENGTH - 3)}...`
}

export function SnippetPickerModal({ filter, selectedIndex, snippets }: SnippetPickerModalProps) {
  const filtered = filterSnippets(snippets, filter)

  return (
    <box
      position="absolute"
      top={0}
      left={0}
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <box
        width="60%"
        border
        borderColor={theme.borderActive}
        backgroundColor={theme.panel}
        flexDirection="column"
        gap={0}
      >
        <box
          paddingLeft={1}
          paddingRight={1}
          paddingTop={1}
          paddingBottom={0}
          flexDirection="column"
        >
          <text fg={theme.accent}>Snippets</text>
          <text fg={theme.textMuted}>
            j/k move, Enter send, n new, e edit, d delete, / filter, Esc cancel.
          </text>
          {filter !== null ? <text fg={theme.text}>/{filter}_</text> : null}
        </box>
        {filtered.length === 0 ? (
          <box paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1}>
            <text fg={theme.textMuted}>
              {filter ? 'No matching snippets.' : 'No snippets yet. Press n to create one.'}
            </text>
          </box>
        ) : null}
        {filtered.map((snippet, index) => {
          const active = index === selectedIndex
          return (
            <box key={snippet.id} flexDirection="row" backgroundColor={theme.background}>
              <box width={1} backgroundColor={active ? theme.borderActive : theme.border} />
              <box
                backgroundColor={active ? theme.panelMuted : theme.background}
                flexDirection="column"
                flexGrow={1}
                paddingLeft={1}
                paddingRight={1}
                paddingTop={0}
                paddingBottom={0}
              >
                <text fg={active ? theme.text : theme.textMuted}>
                  <strong>{snippet.name}</strong>
                </text>
                <text fg={theme.textMuted}> {truncateContent(snippet.content)}</text>
              </box>
            </box>
          )
        })}
      </box>
    </box>
  )
}
