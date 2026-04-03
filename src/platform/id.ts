const RANDOM_ID_START_INDEX = 2
const RANDOM_ID_END_INDEX = 8

export function createPrefixedId(prefix: string): string {
  const suffix = Math.random().toString(36).slice(RANDOM_ID_START_INDEX, RANDOM_ID_END_INDEX)
  return `${prefix}-${Date.now()}-${suffix}`
}
