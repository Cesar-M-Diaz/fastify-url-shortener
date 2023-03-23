require('dotenv').config()
const fastify = require('fastify')
const path = require('node:path')
const handlebars = require('handlebars')
const routes = require('./routes/routes')

function buildApp (opts = {}) {
  const app = fastify(opts)

  app.register(require('@fastify/helmet'), { enableCSPNonces: true })

  app.register(require('@fastify/postgres'), {
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.DATABASE,
    user: process.env.USER_POSTGRES,
    password: process.env.PASSWORD
  })

  app.register(require('@fastify/formbody'))

  app.register(require('@fastify/view'), {
    root: path.join(__dirname, 'views'),
    engine: {
      handlebars
    },
    layout: 'layouts/index.hbs'
  })

  app.register(require('@fastify/static'), {
    root: path.join(__dirname, '/public')
  })

  app.register(require('@fastify/cookie'), { secret: process.env.COOKIE_SECRET })

  app.register(require('@fastify/rate-limit'), {
    max: 100,
    timeWindow: 60000
  })

  app.register(require('fastify-supabase'), {
    supabaseKey: process.env.SUPA_KEY,
    supabaseUrl: process.env.SUPA_URL
  })

  app.register(require('@fastify/multipart'), {
    limits: {
      fieldNameSize: 100, // Max field name size in bytes
      fieldSize: 100, // Max field value size in bytes
      fields: 10, // Max number of non-file fields
      fileSize: 10000000, // For multipart forms, the max file size in bytes
      files: 1, // Max number of file fields
      headerPairs: 2000, // Max number of header key=>value pairs
      parts: 1000 // For multipart forms, the max number of parts (fields + files)
    }
  })

  app.register(require('./plugins/authenticate'))

  app.register(routes)

  handlebars.registerHelper('json', function (obj) {
    return new handlebars.SafeString(JSON.stringify(obj))
  })

  return app
}

module.exports = buildApp
