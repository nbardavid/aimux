export interface RenderableNode {
  parent?: unknown
  requestRender(): void
}

export function isRenderableNode(value: unknown): value is RenderableNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'requestRender') === 'function'
  )
}

export function requestRenderUpTree(node: unknown): void {
  let currentNode = node
  while (isRenderableNode(currentNode)) {
    currentNode.requestRender()
    currentNode = currentNode.parent
  }
}
