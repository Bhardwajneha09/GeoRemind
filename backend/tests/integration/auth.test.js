process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../app');
const { sequelize } = require('../../models');

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    // Ensure in-memory SQLite schema is freshly created
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const testUser = {
    name: 'Integration Tester',
    email: 'integration@example.com',
    password: 'securePassword123'
  };

  let validAuthToken = '';

  test('POST /api/auth/register - Register new user → 201 + token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.name).toBe(testUser.name);
    expect(res.body.user).not.toHaveProperty('password_hash');

    validAuthToken = res.body.token;
  });

  test('POST /api/auth/register - Register duplicate email → 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Another User',
        email: testUser.email,
        password: 'anotherPassword123'
      });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error', 'Email already registered');
  });

  test('POST /api/auth/login - Login with correct credentials → 200 + token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  test('POST /api/auth/login - Login with wrong password → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'incorrectPassword'
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid email or password');
  });

  test('GET /api/auth/me - GET /me with valid token → 200 + user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${validAuthToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.name).toBe(testUser.name);
  });

  test('GET /api/auth/me - GET /me without token → 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});
