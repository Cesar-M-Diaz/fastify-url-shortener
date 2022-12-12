const { shortenOpts } = require('../schemas/shorten')
const { v4: uuidv4 } = require('uuid')

function routes (fastify, options, done) {
  fastify.get('/welcome', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await reply.code(200).view('home.hbs')
  })

  fastify.get('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await reply.code(200).view('shortener.hbs', { title: 'Shorten a url' })
  })

  fastify.get('/register', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await reply.code(200).view('session.hbs', { button: 'Register', action: '/register' })
  })

  fastify.get('/login', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await reply.code(200).view('session.hbs', { button: 'Login', action: '/login' })
  })

  fastify.get('/user-urls', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const client = await fastify.pg.connect()

    const userId = req.user.id

    try {
      const { rows } = await client.query(
        'SELECT id, url FROM urls WHERE user_id=$1', [userId]
      )

      const hbsObj = rows.length > 0 ? { urls: rows } : {}

      return reply.code(200).view('user.hbs', hbsObj)
    } catch (err) {
      return reply.send(err)
    }
  })

  fastify.post('/login', async (req, reply) => {
    const client = await fastify.pg.connect()

    const { email, password } = req.body

    try {
      const { rows } = await client.query(
        'SELECT id, email, password FROM users WHERE email=$1 ', [email]
      )

      if (!rows[0].email) {
        return reply.code(400).view('session.hbs', { error: 'email not found, please enter a valid email', button: 'Login', action: '/login' })
      }

      if (rows[0].password !== password) {
        return reply.code(400).view('session.hbs', { error: 'wrong password', button: 'Login', action: '/login' })
      }

      const token = await fastify.jwt.sign({ id: rows[0].id }, { expiresIn: '1d' })

      return reply.setCookie('token', token, {
        httpOnly: true,
        sameSite: true
      }).redirect(302, '/')
    } catch (error) {
      return reply.send(error)
    } finally {
      client.release()
    }
  })

  fastify.post('/register', async (req, reply) => {
    const client = await fastify.pg.connect()

    const { email, password } = req.body

    try {
      const { rows } = await client.query(
        'SELECT email FROM users WHERE email=$1 ', [email]
      )

      if (rows[0].email) {
        return reply.code(400).view('session.hbs', { error: 'email already exist, please try with another email' })
      }

      const id = uuidv4()

      await client.query(
        'INSERT INTO users(id, email, password) VALUES($1, $2, $3) RETURNING *', [id, email, password]
      )

      const token = await fastify.jwt.sign({ id }, { expiresIn: '1d' })

      return reply.setCookie('token', token, {
        httpOnly: true,
        sameSite: true
      }).redirect(302, '/')
    } catch (error) {
      return reply.send(error)
    } finally {
      client.release()
    }
  })

  fastify.post('/shorten', shortenOpts, async (req, reply) => {
    const client = await fastify.pg.connect()
    const { url: urlString } = req.body

    const user = fastify.jwt.decode(req.cookies.token)
    const userId = user.id

    if (req.validationError) {
      return reply.code(400).view('error.hbs', { message: '400', subtitle: 'Please enter a valid url' })
    }

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
        'INSERT INTO urls(id, url, user_id) VALUES($1, $2, $3) RETURNING *', [randomId, urlString, userId]
      )
      return reply.code(201).view('shortener.hbs', { title: 'Heres your shortened url', shortenedUrl: `${inserted.rows[0].id}` })
    } catch (e) {
      return reply.send(e)
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
      return reply.code(400).view('error.hbs', { message: '400', subtitle: 'Please enter a valid url' })
    } finally {
      client.release()
    }
  })

  fastify.delete('/url/:urlId', async (req, reply) => {
    const client = await fastify.pg.connect()
    const { urlId } = req.params

    const user = fastify.jwt.decode(req.cookies.token)
    const userId = user.id

    try {
      await client.query('DELETE FROM urls WHERE id=$1', [urlId])
      const { rows } = await client.query(
        'SELECT id, url FROM urls WHERE user_id=$1', [userId]
      )
      return reply.code(200).view('user.hbs', { urls: rows })
    } catch (e) {
      return reply.send(e)
    } finally {
      client.release()
    }
  })

  fastify.post('/logout', async (req, reply) => {
    const token = ''
    return reply.setCookie('token', token, {
      httpOnly: true,
      sameSite: true,
      expires: new Date()
    }).redirect(302, '/welcome')
  })

  fastify.setNotFoundHandler((req, reply) => {
    reply.view('error.hbs', { message: '404', subtitle: 'Page not found' })
  })

  done()
}

module.exports = routes
