const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class ReminderLog extends Model {}

ReminderLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    reminder_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    triggered_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    trigger_lat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    },
    trigger_lng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    },
    trigger_type: {
      type: DataTypes.ENUM('enter', 'exit'),
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'ReminderLog',
    tableName: 'reminder_logs',
    timestamps: true
  }
);

module.exports = ReminderLog;
