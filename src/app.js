'use strict'

const EventEmitter = require('events')
const fs = require('fs')
const http = require('http')
const path = require('path')
const { promisify } = require('util')
const open = require('opn')
const sockjs = require('sockjs')
const express = require('express')
const MemoryFileSystem = require('memory-fs')
const { staticPath } = require('./config/config')
const Skeleton = require('./skeleton')
const { generateQR, getLocalIpAddress, sockWrite, injectSkeleton, getOptions, writeMagicHtml } = require('./util/index')


const myFs = new MemoryFileSystem()
class App extends EventEmitter {
  constructor() {
    super()
    this.options = getOptions()
    this.app = null
    this.host = getLocalIpAddress()
    this.port = 7889
    this.previewPageUrl = `http://${this.host}:${this.port}/preview.html`
    this.routesData = null
    this.sockets = []
  }
  async generateSkeletonHTML() {
    const { targets } = this.options
    const skeleton = await new Skeleton(this.options)
    try {
      const { html, route } = await skeleton.genHtml(targets.index.url)
      // CACHE html
      this.routesData = {}
      const fileName = await writeMagicHtml(html)
      const skeletonPageUrl = `http://${this.host}:${this.port}/${fileName}`
      this.routesData[route] = {
        targetFile: targets.index.targetFile,
        url: targets.index.url,
        skeletonPageUrl,
        qrCode: await generateQR(skeletonPageUrl),
        html
      }
      console.log('skeletonPageUrl', skeletonPageUrl)
    } catch (err) {
      const message = err.message || 'generate skeleton screen failed.'
      console.log(message)
    }
  }
  async listen() {
    /* eslint-disable no-multi-assign */
    const app = this.app = express()
    const listenServer = this.listenServer = http.createServer(app)
    /* eslint-enable no-multi-assign */
    await this.initRouters()
    listenServer.listen(this.port, () => {
      console.log(`page-skeleton server listen at port: ${this.port}`)
    })
  }
  async initRouters() {
    const { app } = this
    app.use('/', express.static(path.resolve(__dirname, '../preview/dist')))

    const staticFiles = await promisify(fs.readdir)(path.resolve(__dirname, '../client'))

    staticFiles
      .filter(file => /\.bundle/.test(file))
      .forEach((file) => {
        app.get(`/${staticPath}/${file}`, (req, res) => {
          res.setHeader('Content-Type', 'application/javascript')
          fs.createReadStream(path.join(__dirname, '..', 'client', file)).pipe(res)
        })
      })

    app.get('/preview.html', async (req, res) => {
      fs.createReadStream(path.resolve(__dirname, '..', 'preview/dist/index.html')).pipe(res)
    })

    app.get('/:filename', async (req, res) => {
      const { filename } = req.params
      if (!/\.html$/.test(filename)) return false
      let html = await promisify(fs.readFile)(path.resolve(__dirname, 'templates/notFound.html'), 'utf-8')
      try {
        // if I use `promisify(myFs.readFile)` if will occur an error
        // `TypeError: this[(fn + "Sync")] is not a function`,
        // So `readFile` need to hard bind `myFs`, maybe it's an issue of `memory-fs`
        html = await promisify(myFs.readFile.bind(myFs))(path.resolve(__dirname, `${staticPath}/${filename}`), 'utf-8')
      } catch (err) {
        console.log(`When you request the preview html, ${err} ${filename}`)
      }
      res.send(html)
    })
  }
  resiveSocketData(conn) {
    const { options } = this
    return async (data) => {
      const msg = JSON.parse(data)
      switch (msg.type) {
        case 'saveShellFile': {
          const { route, html } = msg.data
          if (html) {
            this.routesData[route].html = html
            const fileName = await writeMagicHtml(html)
            this.routesData[route].skeletonPageUrl = `http://${this.host}:${this.port}/${fileName}`
            sockWrite([conn], 'update', JSON.stringify(this.routesData))
          }
          break
        }
        case 'writeShellFile': {
          sockWrite([conn], 'console', 'before write shell files...')
          try {
            const { route } = msg.data
            // 只写入当前确定修改好的骨架
            await injectSkeleton(this.routesData[route], options)
          } catch (err) {
            console.log(err)
          }
          const afterWriteMsg = 'Write files successfully...'
          console.log(afterWriteMsg)
          sockWrite([conn], 'console', afterWriteMsg)
          break
        }
        default: break
      }
    }
  }
  initSocket() {
    const { listenServer } = this
    const sockjsServer = sockjs.createServer({
      sockjs_url: `/${this.staticPath}/sockjs.bundle.js`
    })
    this.sockjsServer = sockjsServer
    sockjsServer.installHandlers(listenServer, { prefix: '/socket' })
    sockjsServer.on('connection', (conn) => {
      // generate preview skeleton
      sockWrite([conn], 'url', JSON.stringify(this.routesData))

      if (this.sockets.indexOf(conn) === -1) {
        this.sockets.push(conn)
      }

      conn.on('data', this.resiveSocketData(conn))

      conn.on('close', () => {
        const index = this.sockets.indexOf(conn)
        if (index > -1) this.sockets.splice(index, 1)
        if (this.previewSocket === conn) {
          this.previewSocket = null
          console.log('preview closed')
        }
      })
    })
  }
  async run() {
    await this.generateSkeletonHTML()
    await this.listen().catch(err => console.log(err))
    let appName = 'google chrome'
    if (process.platform === 'win32') {
      appName = 'chrome'
    } else if (process.platform === 'linux') {
      appName = 'google-chrome'
    }
    await this.initSocket()
    open(this.previewPageUrl, { app: [appName, '--incognito'] })
  }
}

module.exports = App