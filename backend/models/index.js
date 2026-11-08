const { sequelize } = require('../config/database');
const User = require('./User');
const Geofence = require('./Geofence');
const Reminder = require('./Reminder');
const ReminderLog = require('./ReminderLog');

// Define Associations

// User -> Geofence
User.hasMany(Geofence, { foreignKey: 'user_id', as: 'geofences', onDelete: 'CASCADE' });
Geofence.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> Reminder
User.hasMany(Reminder, { foreignKey: 'user_id', as: 'reminders', onDelete: 'CASCADE' });
Reminder.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> ReminderLog
User.hasMany(ReminderLog, { foreignKey: 'user_id', as: 'reminder_logs', onDelete: 'CASCADE' });
ReminderLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Geofence -> Reminder
Geofence.hasMany(Reminder, { foreignKey: 'geofence_id', as: 'reminders', onDelete: 'CASCADE' });
Reminder.belongsTo(Geofence, { foreignKey: 'geofence_id', as: 'geofence' });

// Reminder -> ReminderLog
Reminder.hasMany(ReminderLog, { foreignKey: 'reminder_id', as: 'logs', onDelete: 'CASCADE' });
ReminderLog.belongsTo(Reminder, { foreignKey: 'reminder_id', as: 'reminder' });

// Sync in development environment
if (process.env.NODE_ENV === 'development') {
  sequelize.sync({ alter: true }).then(() => {
    console.log('Database synced with alter: true');
  }).catch((err) => {
    console.error('Failed to sync database:', err.message);
  });
}

module.exports = {
  sequelize,
  User,
  Geofence,
  Reminder,
  ReminderLog
};
