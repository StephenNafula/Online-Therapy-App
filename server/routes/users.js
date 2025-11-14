const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../utils/authMiddleware');

// return all therapists (or all users if query param)
router.get('/', async (req, res) => {
  try {
    const role = req.query.role;
    const query = role ? { role } : {};
    const users = await User.find(query).select('-passwordHash');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
