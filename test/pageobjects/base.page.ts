import { $ } from '@wdio/globals'

/**
 * Shared selector helpers for the ApiDemos screens.
 *
 * Every locator is expressed through UiAutomator2 so the page objects stay
 * readable and the specs never have to know about selector syntax.
 */
export default abstract class BasePage {
  /** Match by Android `resource-id`, e.g. `io.appium.android.apis:id/edit`. */
  protected byId(resourceId: string): ChainablePromiseElement {
    return $(`id=${resourceId}`)
  }

  /** Match by the exact visible text of an element. */
  protected byText(text: string): ChainablePromiseElement {
    return $(`android=new UiSelector().text("${text}")`)
  }

  /** Match by accessibility id (content-desc). */
  protected byAccessibilityId(id: string): ChainablePromiseElement {
    return $(`~${id}`)
  }

  /**
   * Scroll the first scrollable container until an element with `text` is on
   * screen, then return it. ApiDemos menus are long lists, so most navigation
   * needs this.
   */
  protected scrollToText(text: string): ChainablePromiseElement {
    return $(
      'android=new UiScrollable(new UiSelector().scrollable(true))' +
        `.scrollIntoView(new UiSelector().text("${text}"))`,
    )
  }

  /** `true` when the element carries `checked="true"` in the view hierarchy. */
  protected async isChecked(element: ChainablePromiseElement): Promise<boolean> {
    return (await element.getAttribute('checked')) === 'true'
  }
}
