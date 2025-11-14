const request = require('supertest');
const { app } = require('../index');
const User = require('../models/User');
const { setupTestDB, teardownTestDB } = require('./testSetup');

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

    // Test signup
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send(userData);
    
    expect(signupRes.status).toBe(200);
    expect(signupRes.body).toHaveProperty('token');
    expect(signupRes.body.user).toHaveProperty('id');
    expect(signupRes.body.user.email).toBe(userData.email);

    // Test login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });
    
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('token');
    expect(loginRes.body.user.email).toBe(userData.email);
  });
});
