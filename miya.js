/*            _
 *  _ __ ___ (_)_   _  __ _
 * | '_ ` _ \| | | | |/ _` |
 * | | | | | | | |_| | (_| |
 * |_| |_| |_|_|\__, |\__,_|
 *              |___/
 *
 * Miya.js is a Collection Runner for Postman.
 * See also:
 * Newman - https://github.com/postmanlabs/newman
 * MongoDB Node.js Driver - https://docs.mongodb.com/drivers/node/
 * node-jq - https://github.com/sanack/node-jq
 */

/*
 * TODO
 * [X] pagination
 * [?] rate limits
 * [ ] folders
 * [X] update
 * [?] dockerize
 * [X] configuration
 */

// Node modules
const newman = require('newman')
const jq = require('node-jq')
const { MongoClient } = require('mongodb')
require('log-timestamp')

// Configuration
const miya = require('./config.js')

// Main
console.log('Collection Runner for Postman')
start()
  .catch((e) => { console.error(e) })

async function start () {
  for (const config of Object.values(miya)) {
    console.log(`Postman collection "${config.name}"`)
    const client = new MongoClient(config.mongodb.uri, { useNewUrlParser: true, useUnifiedTopology: true })

    await database(config, client)
      .catch((e) => { console.error(e) })
  }
}

// Functions
async function database (config, client) {
  try {
    await client.connect()
    const dbo = client.db(config.mongodb.database)
    await runner(dbo, config)
      .then((log) => {
        console.log(log)
      })
      .catch((e) => {
        console.error(e)
      })
  } finally {
    await client.close()
  }
}

async function runner (dbo, config) {
  const a = []
  return new Promise((resolve, reject) => {
    let options
    const folder = config.postman.folder
    if (typeof folder !== 'undefined') {
      options = { collection: config.postman.collection, folder: folder }
    } else {
      options = { collection: config.postman.collection }
    }

    // Postman collection
    newman.run(options)
      // Postman request
      .on('request', (e, args) => {
        if (e) reject(e)
        const raw = args.response.stream // Buffer
        a.push({ collection: args.item.name, json: raw.toString() })
      })
      .on('start', () => {
        console.log('Running...')
      })
      .on('done', async (e, summary) => {
        if (e) {
          reject(e)
        } else {
          console.log(`${summary.run.stats.assertions.total} requests executed (${summary.run.stats.assertions.failed} failed)`)
          console.log(`${(summary.run.transfers.responseTotal / 1024 / 1024).toFixed(3)} MB received`)
          console.log('Database update in progress. Please wait...')
          await parser(config, dbo, a, config.postman.result)
            .catch((e) => { console.error(e) })
          resolve('Database successfully updated!')
        }
      })
  })
}

async function parser (config, dbo, array, data = '.result') {
  for (const obj of array) {
    const collections = config.mongodb.collections
    for (const collection of Object.values(collections)) {
      if (collection.name === obj.collection) {
        const result = await filter(obj.json, data)
          .catch((e) => { console.error(e) })
        const length = await filter(result, '. | length')
          .catch((e) => { console.error(e) })
        for (let i = 0; i < length; i++) {
          const doc = await filter(result, `.[${i}]`, { input: 'string', output: 'json' })
            .catch((e) => { console.error(e) })
          await upsert(dbo, obj.collection, doc, collection.unique)
            .catch((e) => { console.error(e) })
        }
      }
    }
  }
}

async function filter (input, filter, options = { input: 'string', output: 'string' }) {
  try {
    const out = await jq.run(filter, input, options)
    return out
  } catch (e) {
    throw Error(e)
  }
}

async function upsert (dbo, collection, doc, unique = 'id') {
  try {
    const filter = { [unique]: doc[unique] }
    const out = await dbo.collection(collection).updateOne(filter, { $set: doc }, { upsert: true })
    return out.result
  } catch (e) {
    throw Error(e)
  }
}
