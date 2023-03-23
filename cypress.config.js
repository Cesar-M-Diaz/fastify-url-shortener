const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    videoUploadOnPasses: false,
    videoCompression: false,
    video: false,
    viewportWidth: 1920,
    viewportHeight: 1080,
    retries: {
      runMode: 2,
      openMode: 2
    },
    chromeWebSecurity: false,
    testIsolation: false
  }
})
