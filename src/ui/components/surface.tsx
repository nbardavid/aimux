import type { ReactNode } from 'react'

import { theme } from '../theme'

type SurfaceTone = 'muted' | 'elevated' | 'selected' | 'input' | 'inputActive'

function getSurfaceColor(tone: SurfaceTone): string {
  switch (tone) {
    case 'elevated':
      return theme.panel
    case 'selected':
      return theme.panelHighlight
    case 'input':
      return theme.background
    case 'inputActive':
      return theme.panelHighlight
    case 'muted':
    default:
      return theme.panelMuted
  }
}

interface SurfaceProps {
  children: ReactNode
  flexDirection?: 'row' | 'column'
  gap?: number
  padding?: number
  paddingLeft?: number
  paddingRight?: number
  paddingTop?: number
  paddingBottom?: number
  tone?: SurfaceTone
  width?: number | `${number}%`
}

export function Surface({
  children,
  flexDirection = 'column',
  gap = 0,
  padding,
  paddingBottom,
  paddingLeft,
  paddingRight,
  paddingTop,
  tone = 'muted',
  width,
}: SurfaceProps) {
  return (
    <box
      backgroundColor={getSurfaceColor(tone)}
      flexDirection={flexDirection}
      gap={gap}
      padding={padding}
      paddingBottom={paddingBottom}
      paddingLeft={paddingLeft}
      paddingRight={paddingRight}
      paddingTop={paddingTop}
      width={width}
    >
      {children}
    </box>
  )
}
