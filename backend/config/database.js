
require('dotenv').config();
const { Sequelize } = require('sequelize');

const isTestEnv = process.env.NODE_ENV === 'test';

let sequelize;

if (isTestEnv) {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'geo_reminders',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 4000),
      dialect: 'mysql',
      logging: false,

      // Required for secure TiDB Cloud connections
      dialectOptions: {
        ssl: {
          minVersion: 'TLSv1.2'
        }
      },

      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully!');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

module.exports = {
  sequelize,
  testConnection
};
