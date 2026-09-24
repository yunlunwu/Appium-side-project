import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

export const APPIUM_PORT = 4723

function sdkRoot(): string {
  return (
    process.env.ANDROID_HOME ??
    process.env.ANDROID_SDK_ROOT ??
    path.join(os.homedir(), 'Library', 'Android', 'sdk')
  )
}

export function adbPath(): string {
  return path.join(sdkRoot(), 'platform-tools', 'adb')
}

function adb(args: string[]): string | null {
  try {
    return execFileSync(adbPath(), args, { encoding: 'utf8', timeout: 30_000 })
  } catch {
    return null
  }
}

/**
 * The udid of the first device adb reports as fully attached, or null.
 *
 * Pinning the session to a specific udid matters once more than one emulator or
 * a phone is plugged in: without it Appium picks a device for you and the run
 * can silently target the wrong one.
 */
export function attachedDevice(): string | null {
  const out = adb(['devices'])
  if (!out) return null
  for (const line of out.split('\n').slice(1)) {
    const [udid, state] = line.trim().split(/\s+/)
    if (udid && state === 'device') return udid
  }
  return null
}

function bootCompleted(udid: string): boolean {
  return adb(['-s', udid, 'shell', 'getprop', 'sys.boot_completed'])?.trim() === '1'
}

function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', (err: NodeJS.ErrnoException) => resolve(err.code === 'EADDRINUSE'))
    server.once('listening', () => server.close(() => resolve(false)))
    server.listen(port, '127.0.0.1')
  })
}

/**
 * Fail fast, with a message that says what to do.
 *
 * Without this, a missing device or a leftover Appium server shows up as every
 * spec timing out on POST /session minutes later - which reads like a broken
 * test suite rather than a machine that isn't ready.
 */
export async function preflight(): Promise<void> {
  const problems: string[] = []

  if (!existsSync(adbPath())) {
    problems.push(`adb not found at ${adbPath()} — set ANDROID_HOME to your SDK location.`)
  } else {
    const udid = attachedDevice()
    if (!udid) {
      problems.push('No Android device is attached. Start one with `npm run emulator`.')
    } else if (!bootCompleted(udid)) {
      problems.push(`Device ${udid} is still booting — wait for \`npm run emulator\` to print "Emulator ready".`)
    }
  }

  if (await portInUse(APPIUM_PORT)) {
    problems.push(
      `Port ${APPIUM_PORT} is already in use — an Appium server from an earlier run is ` +
        'probably still alive. Stop it with `pkill -f appium` and try again.',
    )
  }

  if (problems.length > 0) {
    const rule = '─'.repeat(72)
    console.error(`\n${rule}\nPre-flight checks failed — not starting the run:\n`)
    for (const problem of problems) console.error(`  • ${problem}`)
    console.error(`${rule}\n`)
    process.exit(1)
  }
}
