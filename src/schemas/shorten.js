const shortenOpts = {
  schema: {
    body: {
      type: 'object',
      required: ['url'],
      properties: {
        url: {
          type: 'string',
          pattern: '^(ftp|http|https):[^ "]+$'
        }
      }
    }
  }
}

module.exports = {
  shortenOpts
}
