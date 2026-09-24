import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

export const APPIUM_PORT = 4723

const SDK_CANDIDATES = [
  path.join(os.homedir(), 'Library', 'Android', 'sdk'), // macOS default
  path.join(os.homedir(), 'Android', 'Sdk'), // Linux default
]

const isSdk = (dir: string) => existsSync(path.join(dir, 'platform-tools', 'adb'))

/**
 * Resolve the Android SDK and export ANDROID_HOME + ANDROID_SDK_ROOT into this
 * process's environment.
 *
 * This is deliberately not left to the user's shell profile. The Appium server
 * is spawned as a child of the test run and refuses to create a session when
 * neither variable is set, so a terminal that predates a `.zshrc` edit - or a
 * CI job, or an IDE runner - would fail with an error far from its cause.
 * Exporting here means every child inherits a correct value. An explicitly set
 * ANDROID_HOME still wins.
 *
 * Returns null when no SDK can be found; preflight turns that into an error.
 */
export function ensureAndroidHome(): string | null {
  const candidates = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, ...SDK_CANDIDATES]
  for (const candidate of candidates) {
    if (candidate && isSdk(candidate)) {
      process.env.ANDROID_HOME = candidate
      process.env.ANDROID_SDK_ROOT = candidate
      return candidate
    }
  }
  return null
}

/**
 * Same idea for the JDK: Appium shells out to Java tooling (apksigner) while
 * preparing the UiAutomator2 server. `/usr/libexec/java_home` reports the JDK
 * macOS knows about, including ones unpacked under ~/Library/Java.
 */
export function ensureJavaHome(): string | null {
  const current = process.env.JAVA_HOME
  if (current && existsSync(path.join(current, 'bin', 'java'))) return current
  try {
    const home = execFileSync('/usr/libexec/java_home', { encoding: 'utf8', timeout: 10_000 }).trim()
    if (home && existsSync(path.join(home, 'bin', 'java'))) {
      process.env.JAVA_HOME = home
      return home
    }
  } catch {
    /* no JDK registered with macOS - reported by preflight */
  }
  return null
}

export function adbPath(): string {
  const root = process.env.ANDROID_HOME ?? SDK_CANDIDATES[0]
  return path.join(root, 'platform-tools', 'adb')
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
 * Without this, a missing toolchain, a missing device or a leftover Appium
 * server shows up as every spec failing on POST /session - which reads like a
 * broken test suite rather than a machine that isn't ready.
 */
export async function preflight(): Promise<void> {
  const problems: string[] = []

  const sdkRoot = ensureAndroidHome()
  if (!sdkRoot) {
    problems.push(
      'Android SDK not found. Set ANDROID_HOME, or install the SDK to ' +
        `${SDK_CANDIDATES[0]} (it must contain platform-tools/adb).`,
    )
  } else {
    const udid = attachedDevice()
    if (!udid) {
      problems.push('No Android device is attached. Start one with `npm run emulator`.')
    } else if (!bootCompleted(udid)) {
      problems.push(`Device ${udid} is still booting — wait for \`npm run emulator\` to print "Emulator ready".`)
    }
  }

  if (!ensureJavaHome()) {
    problems.push('No JDK found. Install JDK 17 (`brew install --cask temurin@17`) or set JAVA_HOME.')
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
