const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Geofence extends Model {}

Geofence.init(
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false
    },
    lng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false
    },
    radius_m: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'Geofence',
    tableName: 'geofences',
    timestamps: true
  }
);

module.exports = Geofence;
