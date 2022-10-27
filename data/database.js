const path = require('node:path')
const Database = require('warehouse')

const db = new Database({
  path: path.join(__dirname, './db.json')
})

const Url = db.model('urls', new Database.Schema({
  url_id: String,
  url: String
}))

module.exports = {
  Url,
  db
}
