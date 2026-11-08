'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reminder_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      reminder_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'reminders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      triggered_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      trigger_lat: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true
      },
      trigger_lng: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true
      },
      trigger_type: {
        type: Sequelize.ENUM('enter', 'exit'),
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

    await queryInterface.addIndex('reminder_logs', ['reminder_id']);
    await queryInterface.addIndex('reminder_logs', ['user_id']);
    await queryInterface.addIndex('reminder_logs', ['triggered_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('reminder_logs');
  }
};
