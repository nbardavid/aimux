import type { MouseEvent as OtuiMouseEvent } from '@opentui/core'

import type { SplitDirection } from '../state/layout-tree'

export interface SplitDragState {
  tabId: string
  direction: SplitDirection
  screenStart: number
  totalSize: number
}

export function getSplitRatioFromDrag(event: OtuiMouseEvent, drag: SplitDragState): number {
  const position = drag.direction === 'vertical' ? event.x : event.y
  return (position - drag.screenStart) / drag.totalSize
}
