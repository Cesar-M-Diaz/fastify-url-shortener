require('dotenv').config()
const fp = require('fastify-plugin')

module.exports = fp(async function (fastify, opts) {
  fastify.register(require('@fastify/jwt'), {
    secret: process.env.SECRET_KEY,
    cookie: {
      cookieName: 'token'
    }
  })

  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify()
      if (request.url === '/welcome' || request.url === '/login' || request.url === '/register') {
        return reply.redirect(302, '/')
      }
    } catch (err) {
      if (request.url === '/welcome' || request.url === '/login' || request.url === '/register') {
        return err
      }
      return reply.redirect(302, '/welcome')
    }
  })
})
