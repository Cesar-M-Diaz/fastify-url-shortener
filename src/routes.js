const { shortenOpts } = require('./schemas/shorten')
const { Url, db } = require('../data/database')

// TODO: use https://www.npmjs.com/package/warehouse database ✅
// TODO: use standard instead of eslint ✅
// TODO: see when I should use ; or not in javascript ✅
// TODO: do postgres tutorial https://www.tutorialspoint.com/postgresql/index.htm
// TODO: do postgres tutorial https://platzi.com/cursos/backend-nodejs-postgres/

function routes (fastify, options, done) {
  fastify.get('/', (req, reply) => {
    reply.code(200).view('shortener.hbs', { title: 'Shorten a url' })
  })

  fastify.post('/shorten', shortenOpts, async (req, reply) => {
    const { url: urlString } = req.body
    await db.load()
    const findUrl = Url.findOne({ url: urlString })

    if (findUrl) {
      // 409: conflict, This response is sent when a request conflicts with the current state of the server. (client error)
      return reply.code(409).view('shortener.hbs', { title: 'You already shortened this url', shortenedUrl: `${findUrl.url_id}` })
    } else {
      const randomId = (Math.random() + 1).toString(36).substring(7)
      const newUrlObj = { url_id: randomId, url: urlString }
      Url.insert(newUrlObj)
      db.save()
      return reply.code(201).view('shortener.hbs', { title: 'Heres your shortened url', shortenedUrl: `${newUrlObj.url_id}` })
    }
  })

  fastify.get('/:urlId', async (req, reply) => {
    const { urlId } = req.params
    await db.load()
    const findUrl = Url.findOne({ url_id: urlId })
    if (findUrl) {
      return reply.redirect(302, findUrl.url)
    } else {
      return reply.code(404).view('error.hbs', { message: '404', subtitle: 'It looks like this is not a valid url' })
    }
  })

  fastify.setErrorHandler((error, req, reply) => {
    if (error.statusCode === 400) {
      reply.code(400).view('error.hbs', {
        message: '400',
        subtitle: 'Please enter a valid url'
      })
    }
  })

  done()
}

module.exports = routes
