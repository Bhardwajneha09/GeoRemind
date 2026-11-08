'use strict';
const bcrypt = require('bcryptjs');

const USER_1_ID = '11111111-1111-4111-a111-111111111111';
const USER_2_ID = '22222222-2222-4222-a222-222222222222';

const GEOFENCE_1_ID = '33333333-3333-4333-a333-333333333333';
const GEOFENCE_2_ID = '44444444-4444-4444-a444-444444444444';
const GEOFENCE_3_ID = '55555555-5555-4555-a555-555555555555';

const REMINDER_1_ID = '66666666-6666-4666-a666-666666666666';
const REMINDER_2_ID = '77777777-7777-4777-a777-777777777777';
const REMINDER_3_ID = '88888888-8888-4888-a888-888888888888';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash('password123', 10);
    const now = new Date();

    // 1. Seed Demo Users
    await queryInterface.bulkInsert('users', [
      {
        id: USER_1_ID,
        name: 'Alice Johnson',
        email: 'alice@example.com',
        password_hash: passwordHash,
        fcm_token: 'demo_fcm_token_alice_123',
        createdAt: now,
        updatedAt: now
      },
      {
        id: USER_2_ID,
        name: 'Bob Smith',
        email: 'bob@example.com',
        password_hash: passwordHash,
        fcm_token: null,
        createdAt: now,
        updatedAt: now
      }
    ]);

    // 2. Seed Geofences around iconic landmarks
    await queryInterface.bulkInsert('geofences', [
      {
        id: GEOFENCE_1_ID,
        user_id: USER_1_ID,
        name: 'Eiffel Tower, Paris',
        lat: 48.8584,
        lng: 2.2945,
        radius_m: 200,
        is_active: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: GEOFENCE_2_ID,
        user_id: USER_1_ID,
        name: 'Times Square, New York',
        lat: 40.758,
        lng: -73.9855,
        radius_m: 150,
        is_active: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: GEOFENCE_3_ID,
        user_id: USER_2_ID,
        name: 'Big Ben, London',
        lat: 51.5007,
        lng: -0.1246,
        radius_m: 100,
        is_active: true,
        createdAt: now,
        updatedAt: now
      }
    ]);

    // 3. Seed Sample Reminders
    await queryInterface.bulkInsert('reminders', [
      {
        id: REMINDER_1_ID,
        user_id: USER_1_ID,
        geofence_id: GEOFENCE_1_ID,
        message: "Don't forget to take photos from the summit!",
        trigger_type: 'enter',
        is_recurring: false,
        is_active: true,
        last_triggered_at: null,
        createdAt: now,
        updatedAt: now
      },
      {
        id: REMINDER_2_ID,
        user_id: USER_1_ID,
        geofence_id: GEOFENCE_2_ID,
        message: 'Grab Broadway show tickets at the TKTS booth!',
        trigger_type: 'enter',
        is_recurring: false,
        is_active: true,
        last_triggered_at: null,
        createdAt: now,
        updatedAt: now
      },
      {
        id: REMINDER_3_ID,
        user_id: USER_2_ID,
        geofence_id: GEOFENCE_3_ID,
        message: 'Check the clock chime on the hour!',
        trigger_type: 'both',
        is_recurring: true,
        is_active: true,
        last_triggered_at: null,
        createdAt: now,
        updatedAt: now
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('reminders', null, {});
    await queryInterface.bulkDelete('geofences', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
