import { theme } from '../theme'
import { THEME_IDS, type ThemeId, THEMES } from '../themes'

interface ThemePickerModalProps {
  selectedIndex: number
  currentThemeId: ThemeId
}

export function ThemePickerModal({ currentThemeId, selectedIndex }: ThemePickerModalProps) {
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
        width={40}
        gap={1}
        border
      >
        <text fg={theme.accent}>Select theme</text>
        <text fg={theme.textMuted}>j/k move, Enter confirm, Esc cancel.</text>
        {THEME_IDS.map((id, index) => {
          const entry = THEMES[id]
          const active = index === selectedIndex
          const isCurrent = id === currentThemeId
          return (
            <box flexDirection="row" key={id}>
              <text fg={active ? theme.text : theme.textMuted}>
                {active ? '>' : ' '} {entry.name}
              </text>
              {isCurrent ? <text fg={theme.accent}> *</text> : null}
            </box>
          )
        })}
      </box>
    </box>
  )
}
