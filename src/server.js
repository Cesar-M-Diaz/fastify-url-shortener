const fastify = require('fastify')()
const path = require('node:path')
const handlebars = require('handlebars')
const routes = require('./routes')

fastify.register(require('@fastify/swagger'), {
  exposeRoute: true,
  routePrefix: 'docs',
  swagger: {
    info: { title: 'url-shortener-api' }
  }
})

fastify.register(require('@fastify/formbody'))

// TODO: see how to put load a default css template
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

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err
})
