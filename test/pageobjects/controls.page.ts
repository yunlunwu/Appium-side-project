import BasePage from './base.page.js'

const PKG = 'io.appium.android.apis'

/** `Views > Controls > 1. Light Theme` - a form with one of every basic widget. */
class ControlsPage extends BasePage {
  get screenTitle() {
    return this.byId('android:id/title')
  }

  get editField() {
    return this.byId(`${PKG}:id/edit`)
  }

  get checkbox1() {
    return this.byId(`${PKG}:id/check1`)
  }

  get checkbox2() {
    return this.byId(`${PKG}:id/check2`)
  }

  get radio1() {
    return this.byId(`${PKG}:id/radio1`)
  }

  get radio2() {
    return this.byId(`${PKG}:id/radio2`)
  }

  get toggle1() {
    return this.byId(`${PKG}:id/toggle1`)
  }

  get spinner() {
    return this.byId(`${PKG}:id/spinner1`)
  }

  get saveButton() {
    return this.byId(`${PKG}:id/button`)
  }

  get disabledSaveButton() {
    return this.byId(`${PKG}:id/button_disabled`)
  }

  async waitUntilLoaded(): Promise<void> {
    await this.editField.waitForDisplayed()
  }

  async typeIntoEditField(value: string): Promise<void> {
    await this.editField.clearValue()
    await this.editField.setValue(value)
  }

  async isCheckbox1Checked(): Promise<boolean> {
    return this.isChecked(this.checkbox1)
  }

  async isCheckbox2Checked(): Promise<boolean> {
    return this.isChecked(this.checkbox2)
  }

  async isRadio1Selected(): Promise<boolean> {
    return this.isChecked(this.radio1)
  }

  async isRadio2Selected(): Promise<boolean> {
    return this.isChecked(this.radio2)
  }

  /** Open the planet dropdown and pick an entry by its label. */
  async selectPlanet(name: string): Promise<void> {
    await this.spinner.click()
    await this.byText(name).waitForDisplayed()
    await this.byText(name).click()
  }

  /** The label currently rendered inside the spinner. */
  async selectedPlanet(): Promise<string> {
    return this.spinner.$('android.widget.TextView').getText()
  }
}

export default new ControlsPage()
