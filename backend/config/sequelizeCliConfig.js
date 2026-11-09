
require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'location_reminders',
    host: process.env.DB_HOST || '127.0.0.1',
    port: 3306,
    dialect: 'mysql'
  },

  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  },
production: {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: 4000,
  dialect: 'mysql',
  dialectOptions: {
    ssl: {
      minVersion: 'TLSv1.2'
    }
  },
  logging: false
}
};