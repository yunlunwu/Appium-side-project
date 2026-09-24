import { browser, expect } from '@wdio/globals'
import HomePage from '../pageobjects/home.page.js'
import ControlsPage from '../pageobjects/controls.page.js'

describe('Controls form widgets', () => {
  beforeEach(async () => {
    await browser.execute('mobile: terminateApp', { appId: 'io.appium.android.apis' })
    await browser.execute('mobile: activateApp', { appId: 'io.appium.android.apis' })
    await HomePage.waitUntilLoaded()
    await HomePage.navigate('Views', 'Controls', '1. Light Theme')
    await ControlsPage.waitUntilLoaded()
  })

  it('keeps the text typed into the edit field', async () => {
    await ControlsPage.typeIntoEditField('Appium + WebdriverIO')

    await expect(ControlsPage.editField).toHaveText('Appium + WebdriverIO')
  })

  it('toggles each checkbox independently', async () => {
    expect(await ControlsPage.isCheckbox1Checked()).toBe(false)
    expect(await ControlsPage.isCheckbox2Checked()).toBe(false)

    await ControlsPage.checkbox1.click()

    expect(await ControlsPage.isCheckbox1Checked()).toBe(true)
    expect(await ControlsPage.isCheckbox2Checked()).toBe(false)
  })

  it('allows only one radio button in the group to be selected', async () => {
    await ControlsPage.radio1.click()
    expect(await ControlsPage.isRadio1Selected()).toBe(true)
    expect(await ControlsPage.isRadio2Selected()).toBe(false)

    await ControlsPage.radio2.click()
    expect(await ControlsPage.isRadio1Selected()).toBe(false)
    expect(await ControlsPage.isRadio2Selected()).toBe(true)
  })

  it('flips the toggle button from OFF to ON', async () => {
    await expect(ControlsPage.toggle1).toHaveText('OFF')

    await ControlsPage.toggle1.click()

    await expect(ControlsPage.toggle1).toHaveText('ON')
  })

  it('selects a planet from the spinner', async () => {
    expect(await ControlsPage.selectedPlanet()).toBe('Mercury')

    await ControlsPage.selectPlanet('Jupiter')

    expect(await ControlsPage.selectedPlanet()).toBe('Jupiter')
  })

  it('renders the second Save button as disabled', async () => {
    await expect(ControlsPage.saveButton).toBeEnabled()
    await expect(ControlsPage.disabledSaveButton).toBeDisabled()
  })
})
