require('dotenv').config()
const { shortenOpts, userOpts } = require('../schemas/schemas')
const errorValidator = require('../utils/validationErr')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')

const urlName = process.env.URL_NAME

function routes (fastify, options, done) {
  fastify.get('/welcome', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await reply.code(200).view('home.hbs', { scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style })
  })

  fastify.get('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await reply.code(200).view('shortener.hbs', { title: 'Shorten a url', scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style, urlName })
  })

  fastify.get('/register', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await reply.code(200).view('session.hbs', { button: 'Register', action: '/register', scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style })
  })

  fastify.get('/login', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await reply.code(200).view('session.hbs', { button: 'Login', action: '/login', scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style })
  })

  fastify.get('/user-urls', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const nonce = { scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style }
    const client = await fastify.pg.connect()

    const userId = req.user.id

    try {
      const { rows } = await client.query(
        'SELECT id, url FROM urls WHERE user_id=$1', [userId]
      )

      const hbsObj = rows.length > 0 ? { urls: rows, ...nonce, urlName } : { ...nonce }
      return reply.code(200).view('user.hbs', hbsObj)
    } catch (err) {
      return reply.send(err)
    }
  })

  fastify.post('/login', userOpts, async (req, reply) => {
    const nonce = { scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style }
    const client = await fastify.pg.connect()

    const { email, password } = req.body

    if (req.validationError) return errorValidator(reply, req.validationError.message, 'login', email, password)

    try {
      const { rows } = await client.query(
        'SELECT id, email, password FROM users WHERE email=$1 ', [email]
      )
      // email or password is wrong, with this Im not helping the hacker
      if (!rows[0]?.email) {
        return reply.code(400).view('session.hbs', { error: 'wrong credentials, please try again', button: 'Login', action: '/login', email, password, ...nonce })
      }

      const match = await bcrypt.compare(password, rows[0].password)

      if (!match) {
        return reply.code(400).view('session.hbs', { error: 'wrong credentials, please try again', button: 'Login', action: '/login', email, password, ...nonce })
      }

      const token = await fastify.jwt.sign({ id: rows[0].id }, { expiresIn: 86400000 })

      return reply.setCookie('token', token, {
        // secure: true,
        httpOnly: true,
        sameSite: true,
        signed: true
      }).redirect(302, '/')
    } catch (error) {
      return reply.send(error)
    } finally {
      client.release()
    }
  })

  fastify.post('/register', userOpts, async (req, reply) => {
    const client = await fastify.pg.connect()

    const { email, password } = req.body

    if (req.validationError) return errorValidator(reply, req.validationError.message, 'register', email, password)

    try {
      const { rows } = await client.query(
        'SELECT email FROM users WHERE email=$1 ', [email]
      )

      if (rows.length !== 0) {
        return reply.code(400).view('session.hbs', { error: 'email already exist, please try with another email', button: 'Register', action: '/register', email, password, scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style })
      }

      const id = uuidv4()
      const hash = await bcrypt.hash(password, 10)

      await client.query(
        'INSERT INTO users(id, email, password) VALUES($1, $2, $3) RETURNING *', [id, email, hash]
      )

      const token = await fastify.jwt.sign({ id }, { expiresIn: 86400000 })

      return reply.setCookie('token', token, {
        // secure: true,
        httpOnly: true,
        sameSite: true,
        signed: true
      }).redirect(302, '/')
    } catch (error) {
      return reply.send(error)
    } finally {
      client.release()
    }
  })

  fastify.post('/shorten', shortenOpts, async (req, reply) => {
    const nonce = { scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style }
    const client = await fastify.pg.connect()
    const { url: urlString } = req.body

    const clearCookie = req.unsignCookie(req.cookies.token)
    let user
    let userId
    if (clearCookie.valid) {
      user = fastify.jwt.decode(clearCookie.value)
      userId = user.id
    } else {
      return reply.code(409).view('error.hbs', { message: 'Something went wrong', ...nonce })
    }

    if (req.validationError) return errorValidator(reply, req.validationError.message)

    try {
      const { rows } = await client.query(
        'SELECT id, url FROM urls WHERE url=$1', [urlString]
      )
      if (rows.length > 0) {
        // 409: conflict, This response is sent when a request conflicts with the current state of the server. (client error)
        return reply.code(409).view('shortener.hbs', { title: 'You already shortened this url', shortenedUrl: `${rows[0].id}`, ...nonce, urlName })
      }
      const randomId = (Math.random() + 1).toString(36).substring(7)
      const inserted = await client.query(
        'INSERT INTO urls(id, url, user_id) VALUES($1, $2, $3) RETURNING *', [randomId, urlString, userId]
      )
      return reply.code(201).view('shortener.hbs', { title: 'Heres your shortened url', shortenedUrl: `${inserted.rows[0].id}`, ...nonce, urlName })
    } catch (e) {
      return reply.send(e)
    } finally {
      client.release()
    }
  })

  fastify.get('/url/:urlId', async (req, reply) => {
    const nonce = { scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style }
    const client = await fastify.pg.connect()
    const { urlId } = req.params
    try {
      const { rows } = await client.query(
        'SELECT id, url FROM urls WHERE id=$1', [urlId]
      )
      if (rows.length > 0) {
        return reply.redirect(302, rows[0].url)
      }
      return reply.code(404).view('error.hbs', { message: '404', subtitle: 'It looks like this is not a valid url', ...nonce })
    } catch (e) {
      return reply.code(400).view('error.hbs', { message: '400', subtitle: 'Please enter a valid url', ...nonce })
    } finally {
      client.release()
    }
  })

  fastify.delete('/url/:urlId', async (req, reply) => {
    const nonce = { scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style }
    const client = await fastify.pg.connect()
    const { urlId } = req.params

    const clearCookie = req.unsignCookie(req.cookies.token)
    let user
    let userId
    if (clearCookie.valid) {
      user = fastify.jwt.decode(clearCookie.value)
      userId = user.id
    } else {
      return reply.code(409).view('error.hbs', { message: 'Something went wrong', ...nonce })
    }

    try {
      await client.query('DELETE FROM urls WHERE id=$1', [urlId])
      const { rows } = await client.query(
        'SELECT id, url FROM urls WHERE user_id=$1', [userId]
      )
      return reply.code(200).view('user.hbs', { urls: rows, ...nonce, urlName })
    } catch (e) {
      return reply.send(e)
    } finally {
      client.release()
    }
  })

  fastify.post('/logout', (req, reply) => {
    reply.clearCookie('token', { path: '/' }).redirect(302, '/welcome')
  })

  fastify.setNotFoundHandler(
    {
      preHandler: fastify.rateLimit({
        max: 4,
        timeWindow: 60000
      })
    }, (req, reply) => {
      reply.view('error.hbs', { message: '404', subtitle: 'Page not found', scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style })
    })

  done()
}

module.exports = routes
