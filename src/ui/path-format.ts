import { homedir } from 'node:os'

export function abbreviatePath(path: string): string {
  const home = homedir()
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path
}
