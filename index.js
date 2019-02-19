'use strict'

const SkeletonPlugin = require('./src/skeletonPlugin')
const Skeleton = require('./src/skeleton')
const App = require('./src/app')

App.SkeletonPlugin = SkeletonPlugin
App.Skeleton = Skeleton
const app = new App()
app.run()
module.exports = App
