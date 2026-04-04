import { theme } from '../theme'

export function SessionNameModal({ title, value }: { title: string; value: string }) {
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
        <text fg={theme.accentAlt}>{title}</text>
        <text fg={theme.textMuted}>Type a session name. Enter confirm, Esc cancel.</text>
        <box backgroundColor={theme.panelMuted} borderColor={theme.borderActive} padding={1} border>
          <text fg={theme.text}>{value}_</text>
        </box>
      </box>
    </box>
  )
}
