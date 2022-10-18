// const { writeFile } = require('node:fs')
// const { readFile } = require('node:fs/promises')
// const { join } = require('node:path')
// const urls = require('../data/urls.json')
// const { postInfoOpts, userIdOpts } = require('./schemas')

function routes(fastify, options, done) {
  fastify.get('/', (req, reply) => {
    reply.code(200).view('shortener.hbs')
  })

  done()
}

module.exports = routes
