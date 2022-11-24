require('dotenv').config()
const fastify = require('fastify')()
const path = require('node:path')
const handlebars = require('handlebars')
const routes = require('./routes')
const migrate = require('../migrate')

fastify.register(require('@fastify/postgres'), {
  user: 'postgres',
  host: 'localhost',
  database: 'urls',
  password: process.env.PASSWORD,
  port: 5432
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
