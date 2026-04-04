import { getAllAssistantOptions } from '../../pty/command-registry'
import { theme } from '../theme'

interface NewTabModalProps {
  selectedIndex: number
  customCommands: Record<string, string>
  editBuffer: string | null
}

export function NewTabModal({ customCommands, editBuffer, selectedIndex }: NewTabModalProps) {
  const options = getAllAssistantOptions(customCommands)

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
        width={48}
        gap={1}
        border
      >
        <text fg={theme.accentAlt}>New assistant tab</text>
        {editBuffer !== null ? (
          <>
            <text fg={theme.textMuted}>
              Editing command for {options[selectedIndex]?.label}. Enter to confirm, Esc to cancel.
            </text>
            <box
              backgroundColor={theme.panelMuted}
              borderColor={theme.borderActive}
              padding={1}
              border
            >
              <text fg={theme.text}>{editBuffer}_</text>
            </box>
          </>
        ) : (
          <>
            <text fg={theme.textMuted}>
              Use j/k or arrows, Enter to confirm, e to edit command, Esc to cancel.
            </text>
            {options.map((option, index) => {
              const active = index === selectedIndex
              const customCmd = customCommands[option.id]

              return (
                <box
                  backgroundColor={active ? theme.panelMuted : theme.background}
                  borderColor={active ? theme.borderActive : theme.border}
                  flexDirection="column"
                  key={option.id}
                  padding={1}
                  border
                >
                  <text fg={active ? theme.text : theme.textMuted}>
                    {active ? '>' : ' '} {option.label}
                  </text>
                  <text fg={theme.textMuted}>{option.description}</text>
                  {customCmd ? <text fg={theme.accent}>{customCmd}</text> : null}
                </box>
              )
            })}
          </>
        )}
      </box>
    </box>
  )
}
