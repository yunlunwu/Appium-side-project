import { browser, expect } from '@wdio/globals'
import HomePage, { CATEGORIES } from '../pageobjects/home.page.js'
import ControlsPage from '../pageobjects/controls.page.js'

describe('ApiDemos navigation', () => {
  beforeEach(async () => {
    // Every test starts from a freshly launched app rather than from wherever
    // the previous test happened to leave the device.
    await browser.execute('mobile: terminateApp', { appId: 'io.appium.android.apis' })
    await browser.execute('mobile: activateApp', { appId: 'io.appium.android.apis' })
    await HomePage.waitUntilLoaded()
  })

  it('shows every top-level category on the home screen', async () => {
    for (const category of CATEGORIES) {
      const item = HomePage.item(category)
      await expect(item).toBeDisplayed()
    }
  })

  it('drills down from the home list into the Controls demo', async () => {
    await HomePage.navigate('Views', 'Controls', '1. Light Theme')
    await ControlsPage.waitUntilLoaded()

    await expect(ControlsPage.screenTitle).toHaveText('Views/Controls/1. Light Theme')
    await expect(ControlsPage.saveButton).toBeDisplayed()
  })

  it('returns to the previous list when the device back button is pressed', async () => {
    await HomePage.navigate('Views', 'Controls', '1. Light Theme')
    await ControlsPage.waitUntilLoaded()

    await browser.back()

    await expect(HomePage.item('1. Light Theme')).toBeDisplayed()
    await expect(HomePage.item('6. Holo or Old Theme')).toBeDisplayed()
  })
})
