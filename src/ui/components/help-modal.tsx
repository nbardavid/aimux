import { theme } from '../theme'

const SECTIONS = [
  {
    bindings: [
      ['j / k', 'Move between tabs'],
      ['Shift+J / K', 'Reorder tabs'],
      ['i', 'Focus terminal input'],
      ['r', 'Rename tab'],
      ['?', 'Show this help'],
    ],
    title: 'Navigation',
  },
  {
    bindings: [
      ['Ctrl+n', 'New tab'],
      ['Ctrl+w', 'Close tab'],
      ['Ctrl+r', 'Restart tab'],
      ['Ctrl+g', 'Session picker'],
      ['Ctrl+s', 'Snippet picker'],
      ['Ctrl+t', 'Theme picker'],
    ],
    title: 'Tabs & Sessions',
  },
  {
    bindings: [
      ['Ctrl+b', 'Toggle sidebar'],
      ['Ctrl+h / l', 'Resize sidebar'],
    ],
    title: 'Sidebar',
  },
  {
    bindings: [
      ['Ctrl+z', 'Back to navigation'],
      ['Ctrl+w', 'Enter layout mode'],
      ['Ctrl+b', 'Toggle sidebar'],
    ],
    title: 'Terminal Input',
  },
  {
    bindings: [
      ['|', 'Split vertical'],
      ['-', 'Split horizontal'],
      ['h / j / k / l', 'Focus pane'],
      ['Shift+H/J/K/L', 'Resize pane'],
      ['q', 'Close pane'],
      ['Esc', 'Cancel'],
    ],
    title: 'Layout Mode (Ctrl+w)',
  },
  {
    bindings: [['Ctrl+c', 'Quit']],
    title: 'General',
  },
] as const

export function HelpModal() {
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
        width={50}
        gap={1}
        border
      >
        <text fg={theme.accentAlt}>Keybindings</text>
        {SECTIONS.map((section) => (
          <box flexDirection="column" key={section.title}>
            <text fg={theme.text}>{section.title}</text>
            {section.bindings.map(([key, desc]) => (
              <box flexDirection="row" key={key}>
                <box width={18}>
                  <text fg={theme.accentAlt}> {key}</text>
                </box>
                <text fg={theme.textMuted}>{desc}</text>
              </box>
            ))}
          </box>
        ))}
        <text fg={theme.textMuted}>Press Esc to close</text>
      </box>
    </box>
  )
}
