const { shortenOpts } = require('../schemas/shorten')

function routes (fastify, options, done) {
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await reply.code(200).view('shortener.hbs', { title: 'Shorten a url' })
  })

  fastify.post('/register', async (req, reply) => {
    const token = await fastify.jwt.sign({ name: 'random user' })
    return reply.send({ token })
  })

  fastify.post('/shorten', shortenOpts, async (req, reply) => {
    const client = await fastify.pg.connect()
    const { url: urlString } = req.body

    try {
      const { rows } = await client.query(
        'SELECT id, url FROM urls WHERE url=$1', [urlString]
      )
      if (rows.length > 0) {
        // 409: conflict, This response is sent when a request conflicts with the current state of the server. (client error)
        return reply.code(409).view('shortener.hbs', { title: 'You already shortened this url', shortenedUrl: `${rows[0].id}` })
      }
      const randomId = (Math.random() + 1).toString(36).substring(7)
      const inserted = await client.query(
        'INSERT INTO urls(id, url) VALUES($1, $2) RETURNING *', [randomId, urlString]
      )
      return reply.code(201).view('shortener.hbs', { title: 'Heres your shortened url', shortenedUrl: `${inserted.rows[0].id}` })
    } catch (e) {
      return reply.code(400)
    } finally {
      client.release()
    }
  })

  fastify.get('/url/:urlId', async (req, reply) => {
    const client = await fastify.pg.connect()
    const { urlId } = req.params
    try {
      const { rows } = await client.query(
        'SELECT id, url FROM urls WHERE id=$1', [urlId]
      )
      if (rows.length > 0) {
        return reply.redirect(302, rows[0].url)
      }
      return reply.code(404).view('error.hbs', { message: '404', subtitle: 'It looks like this is not a valid url' })
    } catch (e) {
      return reply.code(400)
    } finally {
      client.release()
    }
  })

  // heres a conflict with jwt and the error handler
  // research the best practices for handling error codes.
  // fastify.setErrorHandler((error, req, reply) => {
  //   if (error.statusCode === 400) {
  //     reply.code(400).view('error.hbs', {
  //       message: '400',
  //       subtitle: 'Please enter a valid url'
  //     })
  //   }
  // })

  done()
}

module.exports = routes
