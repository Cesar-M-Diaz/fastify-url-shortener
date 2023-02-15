require('dotenv').config()
const { shortenOpts, userOpts } = require('../schemas/schemas')
const errorValidator = require('../utils/validationErr')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const { Worker } = require('worker_threads')

const urlName = process.env.URL_NAME

function routes (fastify, options, done) {
  fastify.get('/welcome', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await reply.code(200).view('landing.hbs')
  })

  fastify.get('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await reply.code(200).view('home.hbs', { scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style, urlName })
  })

  fastify.get('/shorten', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await reply.code(200).view('shortener.hbs', { title: 'Shorten a url', scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style, urlName })
  })

  fastify.get('/store', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    await reply.code(200).view('store.hbs', { title: 'Upload a file for storage', scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style, urlName })
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

  fastify.post('/upload-file', async (req, reply) => {
    // pending store urls in postgres
    // think about files page endpoint
    // ORGANIZE CODE
    const nonce = { scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style }
    const supabase = fastify.supabase

    const clearCookie = req.unsignCookie(req.cookies.token)
    // let user
    // let userId
    if (clearCookie.valid) {
      fastify.jwt.decode(clearCookie.value)
      // user = fastify.jwt.decode(clearCookie.value)
      // userId = user.id
    } else {
      return reply.code(409).view('error.hbs', { message: 'Something went wrong', ...nonce })
    }

    if (req.validationError) return errorValidator(reply, req.validationError.message)

    // get the file and store it in buffer, then send to supabase and return public URL
    const fileData = await req.file()
    const buffer = await fileData.toBuffer()

    const { error: uploadError } = await supabase
      .storage
      .from(process.env.SUPA_BUCKET)
      .upload(`${process.env.SUPA_FOLDER}/${fileData.filename}`, buffer)

    if (uploadError) {
      return reply.code(uploadError.statusCode).view('error.hbs', { message: uploadError.statusCode, subtitle: uploadError.message, ...nonce })
    }

    const { publicURL, error: getUrlError } = supabase
      .storage
      .from('fastify-bucket')
      .getPublicUrl(`store-app/${fileData.filename}`)

    if (getUrlError) {
      return reply.code(getUrlError.statusCode).view('error.hbs', { message: getUrlError.statusCode, subtitle: getUrlError.message, ...nonce })
    }
    return reply.code(201).view('store.hbs', { title: 'Heres your file url', storedFileUrl: publicURL, ...nonce })
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

  fastify.setNotFoundHandler({
    preHandler: fastify.rateLimit({
      max: 4,
      timeWindow: 60000
    })
  }, (req, reply) => {
    reply.view('error.hbs', { message: '404', subtitle: 'Page not found', scriptN: reply.cspNonce.script, styleN: reply.cspNonce.style })
  })

  const THREAD_COUNT = 3
  function createWorker () {
    return new Promise(function (resolve, reject) {
      const worker = new Worker('./worker.js', {
        workerData: { thread_count: THREAD_COUNT }
      })
      worker.on('message', (data) => {
        resolve(data)
      })
      worker.on('error', (msg) => {
        reject(new Error(`An error ocurred: ${msg}`))
      })
    })
  }

  fastify.get('/worker-test', async (req, res) => {
    const workerPromises = []
    for (let i = 0; i < THREAD_COUNT; i++) {
      workerPromises.push(createWorker())
    }
    const threadResults = await Promise.all(workerPromises)
    const total = threadResults[0] + threadResults[1] + threadResults[2]
    res.status(200).send(`result is ${total}`)
  })

  done()
}

module.exports = routes
