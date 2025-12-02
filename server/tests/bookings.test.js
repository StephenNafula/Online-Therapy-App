const request = require('supertest');
const { app } = require('../index');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { setupTestDB, teardownTestDB, createTestUser, createTestToken } = require('./testSetup');

describe('Bookings API', () => {
  let therapistToken, clientToken, therapist, client;

  beforeAll(async () => {
    await setupTestDB();
    
    // Create test users with proper password hashing
    therapist = await createTestUser({
      name: 'Test Therapist',
      email: 'test.therapist@example.com',
      password: 'test123!',
      role: 'therapist'
    });
    therapistToken = createTestToken(therapist);

    client = await createTestUser({
      name: 'Test Client',
      email: 'test.client@example.com',
      password: 'test123!'
    });
    clientToken = createTestToken(client);
  }, 30000);

  afterAll(async () => {
    await User.deleteMany({});
    await Booking.deleteMany({});
    await teardownTestDB();
  }, 30000);

  beforeEach(async () => {
    await Booking.deleteMany({});
  });

  it('should create a booking as client', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        therapistId: therapist.id,
        scheduledAt: '2025-11-03T15:00:00.000Z',
        durationMinutes: 50
      });
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('roomId');
    expect(res.body.client).toBe(client.id);
    expect(res.body.therapist).toBe(therapist.id);
    // Default booking status changed to 'pending' by default
    expect(res.body.status).toBe('pending');
  }, 30000);

  it('should reject booking creation without therapistId', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        scheduledAt: '2025-11-03T15:00:00.000Z',
        durationMinutes: 50
      });
    
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  }, 30000);

  it('should list bookings filtered by role', async () => {
    // Create a test booking
    await Booking.create({
      client: client.id,
      therapist: therapist.id,
      scheduledAt: new Date('2025-11-03T15:00:00Z'),
      durationMinutes: 50,
      roomId: 'test_room_123'
    });

    // Test therapist view
    const therapistView = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${therapistToken}`);
    
    expect(therapistView.status).toBe(200);
    expect(Array.isArray(therapistView.body)).toBe(true);
    therapistView.body.forEach(b => {
      expect(b.therapist._id).toBe(therapist.id);
    });

    // Test client view
    const clientView = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${clientToken}`);
    
    expect(clientView.status).toBe(200);
    expect(Array.isArray(clientView.body)).toBe(true);
    clientView.body.forEach(b => {
      expect(b.client._id).toBe(client.id);
    });
  }, 30000);

  it('should allow therapist to update booking status', async () => {
    const booking = await Booking.create({
      client: client.id,
      therapist: therapist.id,
      scheduledAt: new Date('2025-11-03T16:00:00.000Z'),
      durationMinutes: 50,
      roomId: 'test_room_789'
    });

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${therapistToken}`)
      .send({ status: 'completed' });
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  }, 30000);

  it('should reject status updates from client', async () => {
    const booking = await Booking.create({
      client: client.id,
      therapist: therapist.id,
      scheduledAt: new Date('2025-11-03T18:00:00.000Z'),
      durationMinutes: 50,
      roomId: 'test_room_555'
    });
    
    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ status: 'completed' });
    
    expect(res.status).toBe(403);
  }, 30000);

  it('should allow therapist to end call', async () => {
    const booking = await Booking.create({
      client: client.id,
      therapist: therapist.id,
      scheduledAt: new Date('2025-11-03T17:00:00.000Z'),
      durationMinutes: 50,
      roomId: 'test_room_456'
    });

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/end`)
      .set('Authorization', `Bearer ${therapistToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  }, 30000);

  it('should allow therapist to mute/unmute room', async () => {
    const booking = await Booking.create({
      client: client.id,
      therapist: therapist.id,
      scheduledAt: new Date('2025-11-03T19:00:00.000Z'),
      durationMinutes: 50,
      roomId: 'test_room_666'
    });
    
    const muteRes = await request(app)
      .patch(`/api/bookings/${booking.id}/mute`)
      .set('Authorization', `Bearer ${therapistToken}`)
      .send({ muted: true });
    
    expect(muteRes.status).toBe(200);
    expect(muteRes.body.muted).toBe(true);

    const unmuteRes = await request(app)
      .patch(`/api/bookings/${booking.id}/mute`)
      .set('Authorization', `Bearer ${therapistToken}`)
      .send({ muted: false });
    
    expect(unmuteRes.status).toBe(200);
    expect(unmuteRes.body.muted).toBe(false);
  }, 30000);
});
