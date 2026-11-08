process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../app');
const { sequelize } = require('../../models');

describe('Location Check Integration Tests', () => {
  let authToken;
  let geofenceId;
  let reminderId;

  const landmarkLat = 40.7484; // Empire State Building
  const landmarkLng = -73.9857;
  const landmarkRadius = 200; // 200 metres

  beforeAll(async () => {
    // Recreate fresh SQLite in-memory database
    await sequelize.sync({ force: true });

    // Register a test user to obtain authentication token
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Location Tester',
        email: 'location.tester@example.com',
        password: 'securePassword123'
      });

    authToken = registerRes.body.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('Create geofence + reminder via API', async () => {
    // 1. Create Geofence
    const gfRes = await request(app)
      .post('/api/geofences')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Empire State Building',
        lat: landmarkLat,
        lng: landmarkLng,
        radius_m: landmarkRadius
      });

    expect(gfRes.status).toBe(201);
    expect(gfRes.body.geofence).toHaveProperty('id');
    geofenceId = gfRes.body.geofence.id;

    // 2. Create Reminder linked to geofence
    const remRes = await request(app)
      .post('/api/reminders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        geofence_id: geofenceId,
        message: 'Take the elevator to the 86th observatory deck!',
        trigger_type: 'enter',
        is_recurring: true
      });

    expect(remRes.status).toBe(201);
    expect(remRes.body.reminder).toHaveProperty('id');
    reminderId = remRes.body.reminder.id;
  });

  test('POST /api/location/check without auth → 401', async () => {
    const res = await request(app)
      .post('/api/location/check')
      .send({
        lat: landmarkLat,
        lng: landmarkLng
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/location/check with coordinates outside → triggered empty', async () => {
    // Coordinate ~5 km away in upper Manhattan
    const outsideLat = 40.795;
    const outsideLng = -73.9857;

    const res = await request(app)
      .post('/api/location/check')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        lat: outsideLat,
        lng: outsideLng
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('triggered');
    expect(Array.isArray(res.body.triggered)).toBe(true);
    expect(res.body.triggered).toHaveLength(0);
  });

  test('POST /api/location/check with coordinates inside geofence → triggered array not empty', async () => {
    // Coordinate right at the landmark
    const res = await request(app)
      .post('/api/location/check')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        lat: landmarkLat,
        lng: landmarkLng
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('triggered');
    expect(Array.isArray(res.body.triggered)).toBe(true);
    expect(res.body.triggered.length).toBeGreaterThan(0);
    expect(res.body.triggered[0].reminder.id).toBe(reminderId);
    expect(res.body.triggered[0].eventType).toBe('enter');
  });

  test('Rate limiting test: exceed limit → 429', async () => {
    // locationRateLimit is configured for 6 req/min per IP+user
    // Send repeated requests until rate limit is triggered
    let lastStatus = 200;

    for (let i = 0; i < 8; i++) {
      const res = await request(app)
        .post('/api/location/check')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          lat: landmarkLat,
          lng: landmarkLng
        });

      lastStatus = res.status;
      if (lastStatus === 429) {
        break;
      }
    }

    expect(lastStatus).toBe(429);
  });
});
