const jwt = require('jsonwebtoken')

function createTestToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role || 'client' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '7d' }
  )
}

module.exports = { createTestToken }