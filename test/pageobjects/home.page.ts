import BasePage from './base.page.js'

/** Categories that ship with ApiDemos and are expected on a clean launch. */
export const CATEGORIES = [
  'Accessibility',
  'Animation',
  'App',
  'Content',
  'Graphics',
  'Media',
  'NFC',
  'OS',
  'Preference',
  'Text',
  'Views',
] as const

/** The top-level ApiDemos category list. */
class HomePage extends BasePage {
  get list() {
    return this.byId('android:id/list')
  }

  item(name: string) {
    return this.byText(name)
  }

  async waitUntilLoaded(): Promise<void> {
    await this.list.waitForDisplayed()
  }

  /** Tap a menu entry, scrolling it into view first when the list is long. */
  async open(name: string): Promise<void> {
    const item = this.item(name)
    if (!(await item.isExisting())) {
      await this.scrollToText(name).click()
      return
    }
    await item.click()
  }

  /** Walk several list levels in one call, e.g. `Views` -> `Controls`. */
  async navigate(...path: string[]): Promise<void> {
    for (const step of path) {
      await this.open(step)
    }
  }
}

export default new HomePage()
