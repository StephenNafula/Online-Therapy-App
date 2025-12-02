const request = require('supertest');
const { app } = require('../index');
const User = require('../models/User');
const { setupTestDB, teardownTestDB, createTestUser } = require('./testSetup');

describe('Auth API', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await teardownTestDB();
  });

  it('signup and login flow', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'test123!'
    };

    // Signup is disabled; the endpoint should return 403
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send(userData);
    expect(signupRes.status).toBe(403);

    // Create a user directly and then test login flow
    const seeded = await createTestUser(userData);

    // Test login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });
    
    expect(loginRes.status).toBe(200);
    // API returns an accessToken property
    expect(loginRes.body).toHaveProperty('accessToken');
    expect(loginRes.body.user.email).toBe(userData.email);
  });
});
