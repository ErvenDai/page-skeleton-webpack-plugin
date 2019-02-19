'use strict'

const EventEmitter = require('events')
const fs = require('fs')
const merge = require('lodash/merge')
const { defaultOptions, staticPath } = require('./config/config')
const Skeleton = require('./skeleton')

// const Browser = require('./util/browser')
// const { genScriptContent } = require('./util/index')

function getOptions() {
  const userConfigPath = `${process.cwd()}/skeleton.config.js`
  let userOptions = {}
  if (fs.existsSync(userConfigPath)) {
    userOptions = require(userConfigPath) // eslint-disable-line
  }
  return merge({ staticPath }, defaultOptions, userOptions)
}

class App extends EventEmitter {
  constructor() {
    super()
    this.options = getOptions()
  }
  async run() {
    const { targets } = this.options
    const skeleton = await new Skeleton(this.options)
    const a = await skeleton.genHtml(targets.index.url)
    console.log('a', a)
  }
}

module.exports = App
