const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { createServer } = require('http');
const { Server: SocketServer } = require('socket.io');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');

let mongod;
let testPort;

// Create a test token without database access
function createTestToken(user, secret = 'test-secret') {
  return jwt.sign(
    { id: user.id, role: user.role || 'client' },
    secret,
    { expiresIn: '7d' }
  );
}

// Create a test user with proper password hashing
async function createTestUser(userData) {
  const { password, ...rest } = userData;
  const passwordHash = await bcrypt.hash(password, 10);
  return mongoose.model('User').create({
    ...rest,
    passwordHash
  });
}

// Setup test database connection
async function setupTestDB() {
  try {
    await mongoose.disconnect();
  } catch (e) {}

  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGO_URI);
}

// Cleanup test database
async function teardownTestDB() {
  try {
    await mongoose.disconnect();
    await mongod.stop();
  } catch (e) {}
}

// Create a test Socket.IO server
async function createTestSocketServer(app) {
  const { server } = require('../index');
  
  // Start on random port
  return new Promise((resolve) => {
    server.listen(0, () => {
      testPort = server.address().port;
      resolve({ httpServer: server, port: testPort });
    });
  });
}

// Create test Socket.IO clients
async function createTestSocketClients(count = 2) {
  const clients = Array(count).fill(0).map(() => 
    new Client(`http://localhost:${testPort}`, {
      forceNew: true,
      transports: ['websocket']
    })
  );

  await Promise.all(
    clients.map(client => 
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Socket failed to connect after 5 seconds`));
        }, 5000);
        
        client.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        client.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Socket connection error: ${error.message}`));
        });
      })
    )
  );

  return clients;
}

// Cleanup Socket.IO resources
async function cleanupSockets(httpServer, clients = []) {
  await Promise.all([
    ...clients.map(client => 
      new Promise(resolve => {
        try {
          if (client?.connected) {
            client.disconnect();
          }
          resolve();
        } catch (e) {
          console.warn('Error disconnecting client:', e);
          resolve();
        }
      })
    ),
    new Promise(resolve => {
      try {
        if (httpServer?.listening) {
          httpServer.close(resolve);
        } else {
          resolve();
        }
      } catch (e) {
        console.warn('Error closing server:', e);
        resolve();
      }
    })
  ]);
}

module.exports = {
  createTestToken,
  createTestUser,
  setupTestDB,
  teardownTestDB,
  createTestSocketServer,
  createTestSocketClients,
  cleanupSockets
};