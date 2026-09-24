# Android E2E Automation

Mobile UI automation built with **Appium 3 + WebdriverIO 9 + TypeScript**, running against a sample app on an Android emulator.

The app under test is [**ApiDemos**](https://github.com/appium/android-apidemos), the sample app Appium maintains. The APK is committed to this repo (`apps/`), so a fresh clone can run the suite without hunting down a build first.

---

## Stack

| Area | Choice | Why |
|------|--------|-----|
| Automation engine | Appium 3 + UiAutomator2 driver | The industry-standard mobile automation stack |
| Test framework | WebdriverIO 9 + Mocha | Gives us `expect` assertions, retries and reporting |
| Language | TypeScript (strict) | Typed page objects, so refactors are safe |
| Pattern | Page Object Model | Selectors live in one place; specs describe behaviour only |
| Device | Android emulator (Pixel 7, API 35, arm64-v8a) | Runs natively on Apple Silicon |

---

## Layout

```
.
├── apps/
│   └── ApiDemos-debug.apk        # App under test (reinstalled on every run)
├── scripts/
│   └── start-emulator.sh         # Boots the emulator and waits until it is usable
├── test/
│   ├── support/
│   │   └── preflight.ts          # Resolves the toolchain; fails fast if the machine isn't ready
│   ├── pageobjects/
│   │   ├── base.page.ts          # Shared selector helpers (id / text / UiScrollable)
│   │   ├── home.page.ts          # The ApiDemos category list
│   │   └── controls.page.ts      # Views > Controls > 1. Light Theme
│   └── specs/
│       ├── navigation.e2e.ts     # Navigation flows
│       └── controls.e2e.ts       # Form widget interaction
├── wdio.conf.ts                  # WDIO config (also starts the Appium server)
└── .github/workflows/
    └── android-e2e.yml           # CI: runs the suite on an emulator runner
```

---

## What is covered

### `navigation.e2e.ts` — navigation

| Test | Asserts |
|------|---------|
| Home screen lists every category | All 11 categories (Accessibility through Views) are displayed |
| Drill down into the Controls demo | `Views → Controls → 1. Light Theme` opens, titled `Views/Controls/1. Light Theme` |
| Device back button | Returns to the theme list it came from |

### `controls.e2e.ts` — form widgets

| Test | Asserts |
|------|---------|
| Text entry | The edit field keeps what was typed into it |
| Checkboxes | Ticking checkbox 1 leaves checkbox 2 alone |
| Radio group | Selecting radio 2 clears radio 1 |
| Toggle button | Flips from `OFF` to `ON` |
| Spinner | Defaults to `Mercury`; selecting `Jupiter` sticks |
| Disabled state | One Save button is enabled, the other is disabled |

Failing tests screenshot themselves into `logs/`.

---

## Requirements

- Node.js 20+
- JDK 17
- Android SDK (platform-tools, emulator, an API 35 system image)

### Setup on macOS (Apple Silicon)

> ⚠️ On an M-series Mac you need an **arm64** JDK and an **arm64-v8a** system image. x86 images will not run.

```bash
# 1. JDK 17 (arm64)
brew install --cask temurin@17
# or download the macOS aarch64 build from https://adoptium.net/

# 2. Android SDK command-line tools
#    Get them from https://developer.android.com/studio#command-line-tools-only
#    and unpack into $ANDROID_HOME/cmdline-tools/latest

# 3. Environment variables (optional)
#    The test suite does not need these — it locates the SDK and JDK itself.
#    They are still handy for running adb / sdkmanager by hand, so consider
#    adding them to ~/.zshrc:
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

# 4. Install the SDK packages and an arm64 system image
sdkmanager --licenses
sdkmanager "platform-tools" "emulator" "platforms;android-35" \
           "build-tools;35.0.1" "system-images;android-35;google_apis;arm64-v8a"

# 5. Create the AVD
avdmanager create avd -n Pixel_7_API_35 \
  -k "system-images;android-35;google_apis;arm64-v8a" -d pixel_7
```

---

## Running the tests

```bash
npm install

# Boot the emulator (returns only once sys.boot_completed is set; headless by default)
npm run emulator

# Run windowed instead, to watch the tests
# (restarts a running emulator if it is in the wrong mode)
HEADLESS=0 npm run emulator

# Report a mode mismatch instead of restarting
RESTART=0 HEADLESS=0 npm run emulator

# Run everything — WDIO starts the Appium server itself, no second terminal needed
npm test

# Run one suite
npm run test:smoke      # navigation.e2e.ts
npx wdio run ./wdio.conf.ts --suite controls

# Type-check
npm run typecheck
```

---

## Design notes

**WDIO hosts the Appium server.** `wdio.conf.ts` uses `@wdio/appium-service`, so `npm test` starts an Appium server for the run and shuts it down afterwards.

> Do not lower `logLevel` in the service's `args`. `@wdio/appium-service` detects that the server is ready by parsing Appium's own startup banner — quieten it and the service waits until it times out.

**Every test starts from a clean app.** `beforeEach` calls `terminateApp` then `activateApp`, so tests cannot pollute one another and the order they run in doesn't change the result.

**Selector strategy.** `resource-id` wherever there is one (most stable), visible text for list entries, and `UiScrollable` to scroll an entry into view before touching it in the long menus.

**Headless is much faster.** Measured on the same M1 Mac with the same suite: **56s** headless versus **2m 38s** windowed (the navigation spec alone goes from 11s to 1m 32s). Under heavy system load the gap is worse still — a windowed emulator was once measured at 6s for a single `adb shell echo`, against 0.06s headless. So run tests headless and reach for `HEADLESS=0` only when you want to watch.

**`npm run emulator` honours the mode you asked for.** If an emulator is already running in the other window mode, the script restarts it rather than silently reusing it — otherwise `HEADLESS=0` would appear to do nothing and no window would ever show up. Pass `RESTART=0` to have it report the mismatch and leave the running emulator alone.

**The toolchain is resolved in-process, not from your shell.** The Appium server runs as a child of the test process and **refuses to create a session unless `ANDROID_HOME` or `ANDROID_SDK_ROOT` is set in its environment**. [`test/support/preflight.ts`](test/support/preflight.ts) locates the SDK and the JDK as the config loads and writes them into `process.env`, so every child inherits them. That keeps `npm test` behaving identically in a terminal older than your last `.zshrc` edit, in an IDE runner, and in CI. Verified with `ANDROID_HOME`, `ANDROID_SDK_ROOT` and `JAVA_HOME` all unset and `adb` off `PATH`: the full suite still runs green in 58s. An explicitly set `ANDROID_HOME` always wins.

**Pre-flight checks run before the suite.** `onPrepare` verifies the SDK, the JDK, that a booted device is attached, and that port 4723 isn't still held by an Appium server from an earlier run. Anything missing aborts the run in about five seconds with a message that says what to do. Without that layer, each of these surfaces only as every spec failing or hanging on `POST /session` — which reads like a broken test suite when the real problem is a machine that isn't ready. Sessions are also pinned to the udid actually detected, so a second device can't quietly steal the run.

---

## CI

`.github/workflows/android-e2e.yml` runs the suite on [`reactivecircus/android-emulator-runner`](https://github.com/ReactiveCircus/android-emulator-runner) (Linux runners use an x86_64 image with KVM acceleration). On failure it uploads the screenshots from `logs/` as an artifact.

---

## Troubleshooting

| Symptom | Cause and fix |
|---------|---------------|
| `Timeout: Appium did not start within expected time` | The Appium log level in the service `args` is too low for the service to detect startup. Remove it. |
| `Error getting device API level ... adbExec timed out` | The emulator is responding too slowly, usually under memory pressure. Close what's hogging memory, or raise `appium:adbExecTimeout`. |
| `Neither ANDROID_HOME nor ANDROID_SDK_ROOT environment variable was exported` | The SDK isn't in a standard location, so it couldn't be auto-detected. Set `ANDROID_HOME` and re-run. |
| `Port 4723 is already in use` | An Appium server from an earlier run is still alive: `pkill -f appium`. |
| `HEADLESS=0` shows no window | An emulator is already running headless and `RESTART=0` is set. Drop `RESTART=0`, or run `adb emu kill` first. |
| Every spec fails and `logs/` has no screenshots | The failure happened during **session creation**, before any test ran — so it is the environment, not the test logic. The pre-flight output will name the cause. |
| Emulator won't start, or is unusably slow | 1) On Apple Silicon, confirm the image is `arm64-v8a` and not `x86`; 2) run headless (the default); 3) check `uptime` — a machine under heavy load will starve the emulator. |
| `adb: device not found` | `adb kill-server && adb start-server`, then confirm with `adb devices`. |

---

## License

MIT
