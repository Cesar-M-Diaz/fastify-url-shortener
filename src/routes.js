const { writeFile } = require('node:fs')
const { readFile } = require('node:fs/promises')
const { join } = require('node:path')
// const urls = require('../data/urls.json')
// const { postInfoOpts, userIdOpts } = require('./schemas')

// [
//   {
//     id: 'shortened url, comes from the param',
//     url: 'actual url to search for when I write a new short url'
//   }
// ]

const urlDir = join(__dirname, '../data/urls.json')
// TODO: add schemas to test if you have a url, regex in fastify ?
// TODO: validate at the beginning if you are sending something, do this in handlebars

function routes(fastify, options, done) {
  fastify.get('/', (req, reply) => {
    reply.code(200).view('shortener.hbs', { title: 'Shorten a url' })
  })

  fastify.post('/shorten', async (req, reply) => {
    const { url: urlString } = req.body
    const parsedUrls = JSON.parse(await readFile(urlDir, 'utf8'))
    const findUrl = parsedUrls.find(({ url }) => url === urlString)

    if (findUrl === undefined) {
      const randomId = (Math.random() + 1).toString(36).substring(7);
      const newUrlObj = { id: randomId, url: urlString }
      const newUrlsArr = [...parsedUrls, newUrlObj]
      writeFile(urlDir, JSON.stringify(newUrlsArr), (error) => {
        if (error) {
          req.log.error(error)
        }
      })
      return reply.code(200).view('shortener.hbs', { title: 'Heres your shortened url', shortenedUrl: `${newUrlObj.id}` })
    }

    return reply.code(200).view('shortener.hbs', { title: 'You already shortened this url', shortenedUrl: `${findUrl.id}` })
  })

  fastify.get('/:urlId', async (req, reply) => {
    const { urlId } = req.params
    const parsedUrls = JSON.parse(await readFile(urlDir, 'utf8'))
    const findUrl = parsedUrls.find(({ id }) => id === urlId)
    if (findUrl) {
      // TODO: do a complete redirect to a page without localhost
      reply.redirect(302, findUrl.url)
    } else {
      reply.code(404).view('error.hbs', { message: '404', subtitle: 'theres not a url shortened with the provided url' })
    }
  })

  // TODO: set styles to error.hbs
  fastify.setErrorHandler((error, req, reply) => {
    reply.code(error.statusCode).view('error.hbs', {
      message: 'test error'
    })
  })

  // TODO: this one is not working
  fastify.setNotFoundHandler((req, reply) => {
    reply.view('error.hbs', { message: '404', subtitle: 'Page not found' })
  })

  done()
}

module.exports = routes
