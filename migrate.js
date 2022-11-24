require('dotenv').config()

const pg = require('pg')
const Postgrator = require('postgrator')
const path = require('path')

async function migrate () {
  const client = new pg.Client({
    host: process.env.HOST,
    port: process.env.PORT,
    database: process.env.DATABASE,
    user: process.env.USER_POSTGRES,
    password: process.env.PASSWORD
  })

  try {
    await client.connect()

    const postgrator = new Postgrator({
      migrationPattern: path.join(__dirname, './migrations/*'),
      driver: 'pg',
      database: 'urls',
      execQuery: (query) => client.query(query)
    })

    const result = await postgrator.migrate()

    if (result.length === 0) {
      console.log(
        'No migrations run for schema "public". Already at the latest one.'
      )
    } else {
      console.log('Migration done.')
    }

    process.exitCode = 0
  } catch (err) {
    console.error(err)
    process.exitCode = 1
  }

  await client.end()
}

module.exports = migrate
