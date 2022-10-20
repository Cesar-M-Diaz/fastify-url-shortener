const { writeFile } = require('node:fs')
const { readFile } = require('node:fs/promises')
const { join } = require('node:path')
const { shortenOpts } = require('./schemas/shorten')
// TODO: use a database, supabase ? postgress ? mongo ?
// [
//   {
//     id: 'shortened url, comes from the param',
//     url: 'actual url to search for when I write a new short url'
//   }
// ]

const urlDir = join(__dirname, '../data/urls.json')

function routes(fastify, options, done) {
  fastify.get('/', (req, reply) => {
    reply.code(200).view('shortener.hbs', { title: 'Shorten a url' })
  })

  fastify.post('/shorten', shortenOpts, async (req, reply) => {
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
    if (!findUrl) {
      return reply.code(404).view('error.hbs', { message: '404', subtitle: 'It looks like this is not a valid url' })
    }
    return reply.redirect(302, findUrl.url)
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
