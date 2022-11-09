const fastify = require('fastify')()
const path = require('node:path')
const handlebars = require('handlebars')
const routes = require('./routes')

fastify.register(require('@fastify/postgres'), {
  // connectionString: 'postgres://postgres:vacivusVoid1@@localhost:5432/urls'
  user: 'postgres',
  host: 'localhost',
  database: 'urls',
  password: 'vacivusVoid1@',
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

fastify.listen({ port: process.env.PORT || 3000 }, (err) => {
  if (err) throw err
})
