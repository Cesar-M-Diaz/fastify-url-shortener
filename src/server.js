require('dotenv').config()
const fastify = require('fastify')()
const path = require('node:path')
const handlebars = require('handlebars')
const routes = require('./routes/routes')
const migrate = require('./utils/migrate')

fastify.register(require('@fastify/postgres'), {
  host: process.env.HOST,
  port: process.env.PORT,
  database: process.env.DATABASE,
  user: process.env.USER_POSTGRES,
  password: process.env.PASSWORD
})

fastify.register(require('@fastify/formbody'))

fastify.register(require('@fastify/view'), {
  root: path.join(__dirname, 'views'),
  engine: {
    handlebars
  },
  layout: 'layouts/index.hbs'
})

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '/../public')
})

fastify.register(require('@fastify/cookie'))

fastify.register(require('./plugins/authenticate'))

fastify.register(routes)

const start = async () => {
  try {
    await migrate()
    await fastify.listen({ port: 3000 })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
