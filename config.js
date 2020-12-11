module.exports = [
  /* {
    name: 'Vtiger 8',
    mongodb: {
      uri: 'mongodb://localhost:27017',
      database: 'vtiger',
      collections: [
        { name: 'Contacts' },
        { name: 'Assets', unique: 'id' }
      ]
    },
    postman: {
      collection: 'collections/Vtiger 8.postman_collection.json',
      result: '.result',
      folder: 'JSON'
    }
  }, */
  {
    name: 'SWAPI',
    mongodb: {
      uri: 'mongodb://localhost:27017',
      database: 'swapi',
      collections: [
        { name: 'Films', unique: 'episode_id' },
        { name: 'People', unique: 'name' },
        { name: 'Planets', unique: 'name' },
        { name: 'Species', unique: 'name' },
        { name: 'Starships', unique: 'name' },
        { name: 'Vehicles', unique: 'name' }
      ]
    },
    postman: {
      collection: 'collections/SWAPI.postman_collection.json',
      result: '.results'
    }
  }
]
