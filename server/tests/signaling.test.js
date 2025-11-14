const request = require('supertest');
const { app, io } = require('../index');
const User = require('../models/User');
const Booking = require('../models/Booking');
const {
  setupTestDB,
  teardownTestDB,
  createTestUser,
  createTestSocketServer,
  createTestSocketClients,
  cleanupSockets
} = require('./testSetup');

describe('Socket.IO Meeting Signaling', () => {
  let httpServer, testServer, clientSocket, therapistSocket;
  let therapist, client, booking;

  beforeAll(async () => {
    await setupTestDB();

    // Create test users
    therapist = await createTestUser({
      name: 'Test Therapist',
      email: 'therapist@test.com',
      password: 'test123!',
      role: 'therapist'
    });

    client = await createTestUser({
      name: 'Test Client',
      email: 'client@test.com',
      password: 'test123!'
    });

    booking = await Booking.create({
      therapist: therapist.id,
      client: client.id,
      scheduledAt: new Date('2025-11-03T15:00:00Z'),
      durationMinutes: 50,
      roomId: 'test_room_789'
    });

    // Setup Socket.IO test server and clients
    testServer = await createTestSocketServer(app);
    httpServer = testServer.httpServer;
    [clientSocket, therapistSocket] = await createTestSocketClients(2);
  });

  afterAll(async () => {
    await cleanupSockets(httpServer, [clientSocket, therapistSocket]);
    await User.deleteMany({});
    await Booking.deleteMany({});
    await teardownTestDB();
  });

  it('should handle room join and peer notification', async () => {
    const roomId = booking.roomId;
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out waiting for peer-joined event'));
      }, 10000);

      therapistSocket.on('peer-joined', (data) => {
        clearTimeout(timeout);
        expect(data).toHaveProperty('socketId');
        resolve();
      });

      // First join as therapist
      therapistSocket.emit('join-room', roomId);
      
      // Then join as client
      setTimeout(() => {
        clientSocket.emit('join-room', roomId);
      }, 100);
    });
  }, 30000);

  it('should relay WebRTC signaling messages', async () => {
    const roomId = booking.roomId;
    const offerData = { type: 'offer', sdp: 'test-sdp' };
    
    // Clear any existing handlers
    clientSocket.removeAllListeners('signal');
    therapistSocket.removeAllListeners('signal');

    // Join room first
    await Promise.all([
      new Promise(resolve => {
        therapistSocket.emit('join-room', roomId);
        setTimeout(resolve, 100);
      }),
      new Promise(resolve => {
        clientSocket.emit('join-room', roomId);
        setTimeout(resolve, 100);
      })
    ]);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out waiting for signal event'));
      }, 10000);

      const onSignal = ({ from, data }) => {
        if (data.type === 'offer') {
          clearTimeout(timeout);
          expect(data).toEqual(offerData);
          resolve();
        }
      };

      clientSocket.on('signal', onSignal);

      therapistSocket.emit('signal', {
        room: roomId,
        data: offerData
      });
    });
  }, 30000);

  it('should notify when peer leaves room', async () => {
    const roomId = booking.roomId;

    // Join both users first
    await Promise.all([
      new Promise(resolve => {
        clientSocket.emit('join-room', roomId);
        setTimeout(resolve, 100);
      }),
      new Promise(resolve => {
        therapistSocket.emit('join-room', roomId);
        setTimeout(resolve, 100);
      })
    ]);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out waiting for peer-left event'));
      }, 10000);

      clientSocket.on('peer-left', (data) => {
        clearTimeout(timeout);
        expect(data).toHaveProperty('socketId');
        resolve();
      });

      therapistSocket.emit('leave-room', roomId);
    });
  }, 30000);

  it('should handle mute signal in room', async () => {
    const roomId = booking.roomId;
    const muteData = { type: 'mute', muted: true };

    // Clear any existing handlers
    clientSocket.removeAllListeners('signal');
    therapistSocket.removeAllListeners('signal');

    // Join both users first
    await Promise.all([
      new Promise(resolve => {
        clientSocket.emit('join-room', roomId);
        setTimeout(resolve, 100);
      }),
      new Promise(resolve => {
        therapistSocket.emit('join-room', roomId);
        setTimeout(resolve, 100);
      })
    ]);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out waiting for signal event'));
      }, 10000);

      const onSignal = ({ data }) => {
        if (data.type === 'mute') {
          clearTimeout(timeout);
          expect(data).toEqual(muteData);
          resolve();
        }
      };

      clientSocket.on('signal', onSignal);

      therapistSocket.emit('signal', {
        room: roomId,
        data: muteData
      });
    });
  }, 30000);
});
