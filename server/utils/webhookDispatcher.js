const axios = require('axios');
const WebhookKey = require('../models/WebhookKey');

/**
 * Send webhook event to registered endpoints
 * @param {string} eventType - e.g., 'booking.created', 'booking.payment_verified', 'booking.reminder'
 * @param {object} payload - Event data to send
 * @returns {Promise<Array>} Array of webhook results
 */
async function dispatchWebhookEvent(eventType, payload) {
  try {
    // Find all active webhook keys that support this event
    const webhooks = await WebhookKey.find({
      active: true,
      allowedEvents: eventType
    });

    if (webhooks.length === 0) {
      console.log(`No webhooks registered for event: ${eventType}`);
      return [];
    }

    const results = [];
    const timestamp = new Date().toISOString();
    
    for (const webhook of webhooks) {
      try {
        // Create webhook payload with metadata
        const webhookPayload = {
          id: require('crypto').randomUUID(),
          event: eventType,
          timestamp,
          data: payload,
          // For security: include signature so receiver can verify authenticity
          signature: createWebhookSignature(webhook.keyHash, eventType, timestamp, payload)
        };

        // POST to webhook URL with timeout
        const response = await axios.post(webhook.webhookUrl, webhookPayload, {
          timeout: 5000, // 5 second timeout
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Event': eventType,
            'X-Webhook-Signature': webhookPayload.signature,
            'X-Webhook-Timestamp': timestamp
          }
        });

        // Update webhook stats
        webhook.lastWebhookAt = new Date();
        webhook.lastWebhookStatus = response.status;
        webhook.successCount = (webhook.successCount || 0) + 1;
        await webhook.save();

        results.push({
          webhookId: webhook._id,
          url: webhook.webhookUrl,
          status: response.status,
          success: true
        });

        console.log(`Webhook ${webhook._id} dispatched successfully to ${webhook.webhookUrl}`);
      } catch (error) {
        // Update webhook stats with failure
        webhook.lastWebhookAt = new Date();
        webhook.lastWebhookStatus = error.response?.status || 0;
        webhook.failureCount = (webhook.failureCount || 0) + 1;
        await webhook.save();

        results.push({
          webhookId: webhook._id,
          url: webhook.webhookUrl,
          error: error.message,
          success: false
        });

        console.error(`Webhook ${webhook._id} failed:`, error.message);
      }
    }

    return results;
  } catch (err) {
    console.error('Error dispatching webhook events:', err);
    return [];
  }
}

/**
 * Create HMAC signature for webhook authenticity verification
 */
function createWebhookSignature(keyHash, eventType, timestamp, payload) {
  const crypto = require('crypto');
  const message = `${eventType}.${timestamp}.${JSON.stringify(payload)}`;
  const signature = crypto
    .createHmac('sha256', keyHash)
    .update(message)
    .digest('hex');
  return signature;
}

module.exports = {
  dispatchWebhookEvent,
  createWebhookSignature
};
