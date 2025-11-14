const express = require('express');
const router = express.Router();

// Minimal REST endpoints for signaling metadata if needed. Main signaling uses Socket.IO.
router.post('/room-info', (req, res) => {
  // For clients that want to create/get a room id for a booking
  // The server will not store any audio or media -- only the roomId string is used to join socket rooms.
  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ message: 'roomId required' });
  res.json({ roomId });
});

module.exports = router;
