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
  },
  attachValidation: true
}

const userOpts = {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: {
          type: 'string',
          pattern: '^\\S+@\\S+\\.\\S+$'
        },
        password: {
          type: 'string',
          minLength: 5
        }
      }
    }
  },
  attachValidation: true
}

module.exports = {
  shortenOpts,
  userOpts
}
