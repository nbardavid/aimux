import { getDaemonSocketPath, removeDaemonSocketIfExists } from './daemon/runtime-paths'
import { findDaemonPid, killDaemon, spawnDetachedDaemon } from './platform/daemon-control'

export async function runRestartDaemon(): Promise<number> {
  const socketPath = getDaemonSocketPath()
  const pid = await findDaemonPid(socketPath)

  if (pid !== null) {
    process.stdout.write(`Stopping daemon (pid ${pid})...\n`)
    await killDaemon(pid)
    process.stdout.write('Daemon stopped.\n')
  } else {
    process.stdout.write('No running daemon found.\n')
  }

  removeDaemonSocketIfExists()

  process.stdout.write('Starting daemon...\n')
  const ok = await spawnDetachedDaemon()

  if (ok) {
    process.stdout.write('Daemon started.\n')
    return 0
  }

  process.stderr.write('Failed to start daemon.\n')
  return 1
}
