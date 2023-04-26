'use strict'

const { test } = require('tap')
const build = require('../src/app')

test('requests the "/welcome" route', async t => {
  const app = build()

  t.teardown(() => {
    app.close()
  })

  const response = await app.inject({
    method: 'GET',
    url: '/welcome'
  })

  t.equal(response.statusCode, 200, 'returns a status code of 200')
})

test('requests the "/register" route', async t => {
  const app = build()

  t.teardown(() => {
    app.close()
  })

  const response = await app.inject({
    method: 'GET',
    url: '/register'
  })

  t.equal(response.statusCode, 200, 'returns a status code of 200')
})

test('requests the "/login" route', async t => {
  const app = build()

  t.teardown(() => {
    app.close()
  })

  const response = await app.inject({
    method: 'GET',
    url: '/login'
  })

  t.equal(response.statusCode, 200, 'returns a status code of 200')
})
