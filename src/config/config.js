require('dotenv').config();

module.exports = {
  "development": {
    "username": process.env.DB_USERNAME,
    "password": process.env.DB_PASSWORD,
    "database": process.env.DB_DATABASE_NAME,
    "port": process.env.DB_PORT,
    "host": process.env.DB_HOST,
    "dialect": "postgres",
    "protocol": "postgres",

    dialectOptions:
      process.env.DB_SSL === 'true' ?
        {
          ssl: {
            require: true,
            rejectUnauthorized: false
          },
          useUTC: false
        } : {}
    ,
    query: {
      "raw": true
    },
    timezone: "+07:00"
  },
  "test": {
    "username": "root",
    "password": null,
    "database": "database_test",
    "host": "127.0.0.1",
    "dialect": "mysql"
  },
  "production": {
    "username": "root",
    "password": null,
    "database": "database_production",
    "host": "127.0.0.1",
    "dialect": "mysql"
  }
}