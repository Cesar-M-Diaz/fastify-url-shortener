'use strict'

const { test } = require('tap')
const build = require('../src/app')

test('requests the "/" route', async t => {
  const app = build()

  const response = await app.inject({
    method: 'GET',
    url: '/'
  })
  t.equal(response.statusCode, 302, 'returns a status code of 302')
})
