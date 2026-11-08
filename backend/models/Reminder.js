const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Reminder extends Model {}

Reminder.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    geofence_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    trigger_type: {
      type: DataTypes.ENUM('enter', 'exit', 'both'),
      defaultValue: 'enter',
      allowNull: false
    },
    is_recurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    last_triggered_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'Reminder',
    tableName: 'reminders',
    timestamps: true
  }
);

module.exports = Reminder;
