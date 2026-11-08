const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

class User extends Model {
  /**
   * Validates plain text password against stored hash.
   *
   * @param {string} plainPassword
   * @returns {Promise<boolean>}
   */
  async validatePassword(plainPassword) {
    if (!this.password_hash || !plainPassword) return false;
    return bcrypt.compare(plainPassword, this.password_hash);
  }

  /**
   * Hashes a plain text password using bcrypt.
   *
   * @param {string} plainPassword
   * @returns {Promise<string>}
   */
  static async hashPassword(plainPassword) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plainPassword, salt);
  }

  /**
   * Serializes user instance to JSON, safely stripping password_hash.
   *
   * @returns {object}
   */
  toJSON() {
    const values = { ...this.get() };
    delete values.password_hash;
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fcm_token: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true
  }
);

module.exports = User;
