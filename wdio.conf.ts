import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { Options } from '@wdio/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_PATH = path.join(__dirname, 'apps', 'ApiDemos-debug.apk')

export const config: WebdriverIO.Config = {
  runner: 'local',

  tsConfigPath: './tsconfig.json',

  specs: ['./test/specs/**/*.e2e.ts'],
  suites: {
    smoke: ['./test/specs/navigation.e2e.ts'],
    controls: ['./test/specs/controls.e2e.ts'],
  },

  maxInstances: 1,

  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': process.env.ANDROID_DEVICE_NAME ?? 'Android Emulator',
      // Install a known-good build of the app under test on every run so the
      // suite never depends on whatever happens to be on the device already.
      'appium:app': APP_PATH,
      'appium:appPackage': 'io.appium.android.apis',
      'appium:appActivity': '.ApiDemos',
      'appium:appWaitActivity': '*',
      'appium:autoGrantPermissions': true,
      'appium:disableWindowAnimation': true,
      'appium:newCommandTimeout': 240,
      // The emulator can be slow to answer on a loaded machine, so give adb
      // and the UiAutomator2 server generous timeouts.
      'appium:adbExecTimeout': 120_000,
      'appium:uiautomator2ServerInstallTimeout': 120_000,
      'appium:uiautomator2ServerLaunchTimeout': 120_000,
      'appium:androidInstallTimeout': 180_000,
      'appium:avdLaunchTimeout': 300_000,
      'appium:avdReadyTimeout': 300_000,
    },
  ],

  logLevel: 'warn',
  bail: 0,
  waitforTimeout: 20_000,
  // Session creation on a cold emulator installs the UiAutomator2 server and
  // the app under test, which can take several minutes on a busy machine.
  connectionRetryTimeout: 600_000,
  connectionRetryCount: 1,

  // Boots an Appium server for the duration of the run - no separate terminal needed.
  services: [
    [
      'appium',
      {
        // NOTE: do not lower the Appium log level here - @wdio/appium-service
        // detects server startup by parsing Appium's own stdout banner.
        args: {
          address: '127.0.0.1',
          port: 4723,
          relaxedSecurity: true,
        },
        logPath: './logs',
      },
    ],
  ],
  port: 4723,
  path: '/',

  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 120_000,
  },

  afterTest: async function (test, _context, { passed }) {
    if (!passed) {
      const name = test.title.replace(/[^\w]+/g, '-').toLowerCase()
      await browser.saveScreenshot(`./logs/failure-${name}-${Date.now()}.png`)
    }
  },
}
