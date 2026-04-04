import { getAllAssistantOptions } from '../../pty/command-registry'
import { theme } from '../theme'
import { uiTokens } from '../ui-tokens'
import { InputField } from './input-field'
import { ListItem } from './list-item'
import { ModalShell } from './modal-shell'

interface NewTabModalProps {
  selectedIndex: number
  customCommands: Record<string, string>
  editBuffer: string | null
}

export function NewTabModal({ customCommands, editBuffer, selectedIndex }: NewTabModalProps) {
  const options = getAllAssistantOptions(customCommands)
  const selectedOption = options[selectedIndex]

  return (
    <ModalShell
      title="New assistant tab"
      help={
        editBuffer !== null
          ? `Editing command for ${selectedOption?.label}. Enter to confirm, Esc to cancel.`
          : 'Use j/k or arrows, Enter to confirm, e to edit command, Esc to cancel.'
      }
      width={uiTokens.modalWidth.md}
    >
      {editBuffer !== null ? (
        <InputField active value={editBuffer} />
      ) : (
        options.map((option, index) => {
          const active = index === selectedIndex
          const customCmd = customCommands[option.id]

          return (
            <ListItem
              key={option.id}
              active={active}
              title={<text fg={active ? theme.text : theme.textMuted}>{option.label}</text>}
              subtitle={
                <box flexDirection="column">
                  <text fg={theme.textMuted}>{option.description}</text>
                  {customCmd ? <text fg={theme.accent}>{customCmd}</text> : null}
                </box>
              }
            />
          )
        })
      )}
    </ModalShell>
  )
}
