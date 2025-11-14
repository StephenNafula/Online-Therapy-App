const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

let mongod

async function setupTestDB() {
  // Close existing connection if any
  try {
    await mongoose.connection.close()
  } catch (e) {}

  // Create new in-memory MongoDB
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}

async function teardownTestDB() {
  try {
    await mongoose.connection.close()
    await mongod.stop()
  } catch (e) {}
}

async function createTestUser({ name, email, password, role = 'client' }) {
  const passwordHash = await bcrypt.hash(password, 10)
  return mongoose.model('User').create({
    name,
    email,
    passwordHash,
    role
  })
}

module.exports = {
  setupTestDB,
  teardownTestDB,
  createTestUser
}