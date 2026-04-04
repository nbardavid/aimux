import type { ReactNode } from 'react'

import { theme } from '../theme'
import { Surface } from './surface'

interface ListItemProps {
  active: boolean
  leading?: ReactNode
  subtitle?: ReactNode
  title: ReactNode
  trailing?: ReactNode
}

export function ListItem({ active, leading, subtitle, title, trailing }: ListItemProps) {
  return (
    <Surface tone={active ? 'selected' : 'elevated'} paddingLeft={1} paddingRight={1}>
      <box flexDirection="column">
        <box flexDirection="row">
          <text fg={active ? theme.accent : theme.dim}>{active ? '›' : '·'}</text>
          <text> </text>
          {leading}
          {leading ? <text> </text> : null}
          <box flexGrow={1}>{title}</box>
          {trailing ? <box>{trailing}</box> : null}
        </box>
        {subtitle ? <box paddingLeft={2}>{subtitle}</box> : null}
      </box>
    </Surface>
  )
}
