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

function routes(fastify, options, done) {
  fastify.get('/', (req, reply) => {
    reply.code(200).view('shortener.hbs')
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
      return reply.code(200).send(newUrlObj)
    }

    return reply.code(200).send(findUrl)
  })

  done()
}

module.exports = routes
