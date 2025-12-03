const express = require('express');
const router = express.Router();
const WebhookKey = require('../models/WebhookKey');
const { auth, requireRole } = require('../utils/authMiddleware');
const crypto = require('crypto');

/**
 * Middleware to verify API key from header
 * Expects: Authorization: Bearer sk_live_xxxxx
 */
async function verifyWebhookKey(req, res, next) {
  try {
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid Authorization header' });
    }

    const providedKey = authHeader.slice(7); // Remove "Bearer " prefix
    
    // Find webhook by checking key hash
    const webhook = await WebhookKey.findOne({ active: true });
    
    if (!webhook || !webhook.verifyKey(providedKey)) {
      return res.status(401).json({ message: 'Invalid API key' });
    }

    req.webhookKey = webhook;
    next();
  } catch (err) {
    console.error('Webhook key verification error:', err);
    res.status(500).json({ message: 'Internal error' });
  }
}

/**
 * ADMIN ONLY: Create a new API key for webhooks
 * POST /api/webhooks/keys
 */
router.post('/keys', auth(true), requireRole('admin'), async (req, res) => {
  try {
    const { name, webhookUrl, allowedEvents, rateLimit, notes } = req.body;

    if (!name || !webhookUrl || !allowedEvents || allowedEvents.length === 0) {
      return res.status(400).json({
        message: 'Required fields: name, webhookUrl, allowedEvents (array)'
      });
    }

    // Validate webhook URL format
    try {
      new URL(webhookUrl);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid webhookUrl format' });
    }

    // Validate allowed events
    const validEvents = ['booking.created', 'booking.payment_verified', 'booking.reminder'];
    for (const event of allowedEvents) {
      if (!validEvents.includes(event)) {
        return res.status(400).json({
          message: `Invalid event: ${event}. Allowed: ${validEvents.join(', ')}`
        });
      }
    }

    // Generate new API key
    const { rawKey, keyHash, displayKey } = WebhookKey.generateKey();

    const webhookKey = new WebhookKey({
      name,
      keyHash,
      displayKey,
      webhookUrl,
      allowedEvents,
      rateLimit: rateLimit || 1000,
      notes,
      createdBy: req.user.id
    });

    await webhookKey.save();

    // Return the raw key ONLY on creation (it won't be retrievable later)
    res.json({
      success: true,
      message: 'API key created. Save this key securely—it cannot be retrieved later.',
      key: {
        id: webhookKey._id,
        displayKey,
        rawKey, // Only returned here, never stored
        webhookUrl,
        allowedEvents,
        createdAt: webhookKey.createdAt
      }
    });
  } catch (err) {
    console.error('Error creating webhook key:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ADMIN ONLY: List all webhook keys (without raw keys)
 * GET /api/webhooks/keys
 */
router.get('/keys', auth(true), requireRole('admin'), async (req, res) => {
  try {
    const keys = await WebhookKey.find()
      .select('-keyHash') // Don't expose the hash
      .populate('createdBy', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      keys
    });
  } catch (err) {
    console.error('Error listing webhook keys:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ADMIN ONLY: Get details of a specific webhook key
 * GET /api/webhooks/keys/:id
 */
router.get('/keys/:id', auth(true), requireRole('admin'), async (req, res) => {
  try {
    const key = await WebhookKey.findById(req.params.id)
      .select('-keyHash')
      .populate('createdBy', 'name email');

    if (!key) {
      return res.status(404).json({ message: 'Webhook key not found' });
    }

    res.json({ success: true, key });
  } catch (err) {
    console.error('Error fetching webhook key:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ADMIN ONLY: Update a webhook key (e.g., toggle active, change URL)
 * PATCH /api/webhooks/keys/:id
 */
router.patch('/keys/:id', auth(true), requireRole('admin'), async (req, res) => {
  try {
    const { active, webhookUrl, allowedEvents, rateLimit, notes } = req.body;
    const key = await WebhookKey.findById(req.params.id);

    if (!key) {
      return res.status(404).json({ message: 'Webhook key not found' });
    }

    // Update fields if provided
    if (typeof active === 'boolean') key.active = active;
    if (webhookUrl) {
      try {
        new URL(webhookUrl);
        key.webhookUrl = webhookUrl;
      } catch (e) {
        return res.status(400).json({ message: 'Invalid webhookUrl format' });
      }
    }
    if (allowedEvents && Array.isArray(allowedEvents)) {
      const validEvents = ['booking.created', 'booking.payment_verified', 'booking.reminder'];
      for (const event of allowedEvents) {
        if (!validEvents.includes(event)) {
          return res.status(400).json({ message: `Invalid event: ${event}` });
        }
      }
      key.allowedEvents = allowedEvents;
    }
    if (typeof rateLimit === 'number') key.rateLimit = rateLimit;
    if (notes) key.notes = notes;

    await key.save();

    res.json({
      success: true,
      message: 'Webhook key updated',
      key: await key.populate('createdBy', 'name email')
    });
  } catch (err) {
    console.error('Error updating webhook key:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * ADMIN ONLY: Delete a webhook key
 * DELETE /api/webhooks/keys/:id
 */
router.delete('/keys/:id', auth(true), requireRole('admin'), async (req, res) => {
  try {
    const key = await WebhookKey.findByIdAndDelete(req.params.id);

    if (!key) {
      return res.status(404).json({ message: 'Webhook key not found' });
    }

    res.json({
      success: true,
      message: 'Webhook key deleted'
    });
  } catch (err) {
    console.error('Error deleting webhook key:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Test webhook endpoint (admin verification)
 * POST /api/webhooks/test
 */
router.post('/test', auth(true), requireRole('admin'), async (req, res) => {
  try {
    const { keyId } = req.body;

    if (!keyId) {
      return res.status(400).json({ message: 'keyId is required' });
    }

    const key = await WebhookKey.findById(keyId);
    if (!key) {
      return res.status(404).json({ message: 'Webhook key not found' });
    }

    // Create test payload
    const testPayload = {
      id: crypto.randomUUID(),
      event: 'booking.test',
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        message: 'This is a test webhook event'
      }
    };

    // Attempt to send
    const axios = require('axios');
    try {
      const response = await axios.post(key.webhookUrl, testPayload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': 'booking.test'
        }
      });

      res.json({
        success: true,
        message: 'Test webhook sent successfully',
        response: {
          status: response.status,
          data: response.data
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to send test webhook',
        error: error.message,
        status: error.response?.status
      });
    }
  } catch (err) {
    console.error('Error testing webhook:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
