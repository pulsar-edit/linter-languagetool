/* eslint-disable
    no-return-assign,
    no-undef,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let LTStatusView

export default LTStatusView = class LTStatusView {
  constructor () {
    this.viewUpdatePending = false

    this.element = document.createElement('status-bar-lt-server-info')
    this.element.classList.add('lt-server-info', 'inline-block', 'hide')
    this.logo = document.createElement('a')
    this.logo.textContent = 'LT'
    this.element.appendChild(this.logo)

    const lthelper = require('./ltserver-helper')
    this.subscription = lthelper.onDidChangeLTInfo(info => {
      return this.update(info)
    }
    )

    this.tooltip = atom.tooltips.add(this.element, { title: () => `${this.info.name} Version: ${this.info.version} (${this.info.buildDate})` })
  }

  destroy () {
    this.tooltip.dispose()
    return this.subscription.dispose
  }

  update (info) {
    if (this.viewUpdatePending) { return }
    this.viewUpdatePending = true
    return this.updateSubscription = atom.views.updateDocument(() => {
      this.viewUpdatePending = false
      this.info = info
      if (this.info) {
        return this.element.classList.remove('hide')
      } else {
        return this.element.classList.add('hide')
      }
    })
  }
}
