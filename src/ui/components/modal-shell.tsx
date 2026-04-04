import type { ReactNode } from 'react'

import { theme } from '../theme'
import { Surface } from './surface'

interface ModalShellProps {
  children: ReactNode
  footer?: ReactNode
  listGap?: number
  help?: string
  title: string
  width: number | `${number}%`
}

export function ModalShell({ children, footer, help, listGap = 1, title, width }: ModalShellProps) {
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
      <Surface tone="elevated" padding={1} gap={1} width={width}>
        <box width="100%" flexDirection="column" gap={listGap}>
          <box flexDirection="column">
            <text fg={theme.accentAlt}>{title}</text>
            {help ? <text fg={theme.textMuted}>{help}</text> : null}
          </box>
          {children}
          {footer ? <box>{footer}</box> : null}
        </box>
      </Surface>
    </box>
  )
}
