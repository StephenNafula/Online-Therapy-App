const express = require('express');
const router = express.Router();
const { auth } = require('../utils/authMiddleware');
const SecureMessage = require('../models/SecureMessage');
const { body, validationResult } = require('express-validator');

// Send secure message (therapist to admin or vice versa)
router.post('/',
  auth(true),
  [
    body('recipientId').trim().notEmpty().withMessage('Recipient required'),
    body('subject').trim().notEmpty().withMessage('Subject required'),
    body('content').trim().notEmpty().withMessage('Content required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { recipientId, subject, content } = req.body;
      const message = new SecureMessage({
        sender: req.user.id,
        recipient: recipientId,
        subject
      });
      message.encryptMessage(content);
      await message.save();
      res.json({ success: true, messageId: message._id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get messages for current user (inbox)
router.get('/', auth(true), async (req, res) => {
  try {
    const messages = await SecureMessage.find({ recipient: req.user.id })
      .populate('sender', 'name email')
      .sort({ createdAt: -1 });
    // decrypt content for display
    const decrypted = messages.map(m => ({
      _id: m._id,
      sender: m.sender,
      subject: m.subject,
      content: m.decryptMessage(),
      isRead: m.isRead,
      createdAt: m.createdAt
    }));
    res.json(decrypted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark message as read
router.patch('/:id/read', auth(true), async (req, res) => {
  try {
    const message = await SecureMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Not found' });
    if (message.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your message' });
    }
    message.isRead = true;
    await message.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete message
router.delete('/:id', auth(true), async (req, res) => {
  try {
    const message = await SecureMessage.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Not found' });
    if (message.recipient.toString() !== req.user.id && message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your message' });
    }
    await SecureMessage.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
