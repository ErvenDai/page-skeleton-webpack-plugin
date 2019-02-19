'use strict'

const puppeteer = require('puppeteer')
const devices = require('puppeteer/DeviceDescriptors')

class Browser {
  constructor(opts = {}) {
    return (async () => {
      this.opts = opts
      this.browser = null
      await this.init()
      return this
    })()
  }
  async init() {
    const { headless } = this.opts
    this.browser = await puppeteer.launch({ headless })
  }
  async newPage({ url }) {
    const { device } = this.opts
    const page = await this.browser.newPage()
    await page.emulate(devices[device])
    const a = await page.goto(url)
    console.log('a', a)
    return page
  }
}
module.exports = Browser
