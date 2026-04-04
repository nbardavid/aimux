import type { MouseEvent as OtuiMouseEvent } from '@opentui/core'

import type { TerminalContentOrigin } from '../input/raw-input-handler'

import { encodeMouseEventForPty } from '../input/mouse-forwarding'

export const SCROLL_LINES_PER_WHEEL_STEP = 3

export function getForwardedMouseSequence(
  event: OtuiMouseEvent,
  origin: TerminalContentOrigin
): string | null {
  return encodeMouseEventForPty(event, origin)
}

export function getScrollViewportDelta(event: OtuiMouseEvent): number | null {
  if (event.type !== 'scroll') {
    return null
  }

  const direction = event.scroll?.direction
  if (direction === 'up') {
    return -SCROLL_LINES_PER_WHEEL_STEP
  }

  if (direction === 'down') {
    return SCROLL_LINES_PER_WHEEL_STEP
  }

  return null
}
