const migrate = require('./utils/migrate')

const envToLogger = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  },
  production: true,
  test: false
}

const server = require('./app.js')({
  logger: envToLogger[process.env.NODE_ENV] ?? true
})

const start = async () => {
  try {
    await migrate()
    await server.listen({ port: process.env.PORT, host: process.env.DOCKER ? '0.0.0.0' : 'localhost' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
