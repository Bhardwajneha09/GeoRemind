'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('geofences', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      lat: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false
      },
      lng: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false
      },
      radius_m: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('geofences', ['user_id']);
    await queryInterface.addIndex('geofences', ['lat', 'lng']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('geofences');
  }
};
