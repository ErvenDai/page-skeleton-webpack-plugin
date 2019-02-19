'use strict'

module.exports = {
  headless: false,
  targets: {
    index: {
      url: 'https://peisong.meituan.com/app/franchisee/auth',
      targetHtml: './test.html'
    }
  }
}
