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
    process.env.DB_NAME || 'location_reminders',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

/**
 * Tests database connectivity.
 * @returns {Promise<boolean>} True if connection succeeded, false otherwise.
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log(`Database connection has been established successfully (${sequelize.getDialect()}).`);
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    return false;
  }
}

module.exports = {
  sequelize,
  testConnection
};
