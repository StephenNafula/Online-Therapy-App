# Webhook API - Therapy Booking Automation

This document provides technical details for integrating webhooks into your custom applications or setting up automated workflows with Zapier, Make, or similar automation platforms.

## Quick Start

### 1. Create an API Key

Send an authenticated POST request to create a webhook API key:

```bash
curl -X POST https://your-api.onrender.com/api/webhooks/keys \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Zapier Integration",
    "webhookUrl": "https://hooks.zapier.com/hooks/catch/xxx/yyy",
    "allowedEvents": [
      "booking.created",
      "booking.payment_verified",
      "booking.reminder"
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "key": {
    "id": "507f1f77bcf86cd799439011",
    "displayKey": "sk_live_abcd1234",
    "rawKey": "sk_live_xxxxxxxx...abcd1234",
    "webhookUrl": "https://hooks.zapier.com/...",
    "allowedEvents": [
      "booking.created",
      "booking.payment_verified",
      "booking.reminder"
    ],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

⚠️ **Save the `rawKey`** — it will never be shown again!

---

## API Endpoints

### List All Webhook Keys (Admin Only)

```bash
GET /api/webhooks/keys
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "keys": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "My Zapier Integration",
      "displayKey": "sk_live_abcd1234",
      "webhookUrl": "https://hooks.zapier.com/...",
      "allowedEvents": ["booking.created", "booking.payment_verified", "booking.reminder"],
      "active": true,
      "provider": "zapier",
      "rateLimit": 1000,
      "successCount": 245,
      "failureCount": 2,
      "lastWebhookAt": "2024-01-15T14:22:33Z",
      "lastWebhookStatus": 200,
      "createdBy": {
        "_id": "...",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T14:22:33Z"
    }
  ]
}
```

---

### Get Single Webhook Key (Admin Only)

```bash
GET /api/webhooks/keys/{keyId}
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

---

### Update Webhook Key (Admin Only)

Toggle active status, update URL, modify allowed events:

```bash
PATCH /api/webhooks/keys/{keyId}
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "active": true,
  "webhookUrl": "https://hooks.zapier.com/...",
  "allowedEvents": ["booking.created", "booking.payment_verified"],
  "rateLimit": 500,
  "notes": "Main production Zapier integration"
}
```

---

### Delete Webhook Key (Admin Only)

```bash
DELETE /api/webhooks/keys/{keyId}
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

---

### Test Webhook (Admin Only)

Send a test event to your webhook URL to verify connectivity:

```bash
POST /api/webhooks/test
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "keyId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test webhook sent successfully",
  "response": {
    "status": 200,
    "data": { ... }
  }
}
```

---

## Webhook Events

### Event: `booking.created`

**When**: A client creates a booking (either authenticated or guest)

**Example Payload:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event": "booking.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "bookingId": "507f1f77bcf86cd799439011",
    "isGuestBooking": false,
    "client": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "therapist": {
      "id": "507f1f77bcf86cd799439013",
      "name": "Dr. John Doe",
      "email": "john@therapyapp.com"
    },
    "scheduledAt": "2024-01-20T14:00:00Z",
    "durationMinutes": 50,
    "amount": 75.00,
    "currency": "USD",
    "paymentMethod": "bank_transfer"
  },
  "signature": "abc123def456..."
}
```

**Use Cases:**
- Send "booking confirmation pending payment" email to client
- Notify therapist of new booking request
- Create calendar event in therapist's calendar
- Log booking to CRM

---

### Event: `booking.payment_verified`

**When**: Therapist or admin approves payment for a booking

**Example Payload:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "event": "booking.payment_verified",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "data": {
    "bookingId": "507f1f77bcf86cd799439011",
    "client": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "therapist": {
      "id": "507f1f77bcf86cd799439013",
      "name": "Dr. John Doe",
      "email": "john@therapyapp.com"
    },
    "scheduledAt": "2024-01-20T14:00:00Z",
    "durationMinutes": 50,
    "amount": 75.00,
    "currency": "USD",
    "paymentProvider": "bank_transfer",
    "paymentReference": "BANK-REF-123456",
    "secureCallLink": "https://therapyapp.com/meeting/room123?token=abc123def456"
  },
  "signature": "abc123def456..."
}
```

**Use Cases:**
- Send secure call link to client
- Send payment confirmation receipt
- Update booking status in CRM
- Trigger SMS reminder

---

### Event: `booking.reminder`

**When**: Automatically triggered 24 hours, 1 hour, or 15 minutes before session

**Example Payload:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "event": "booking.reminder",
  "timestamp": "2024-01-20T13:45:00.000Z",
  "data": {
    "bookingId": "507f1f77bcf86cd799439011",
    "reminderType": "15m",
    "reminderLabel": "15 minutes",
    "client": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "therapist": {
      "id": "507f1f77bcf86cd799439013",
      "name": "Dr. John Doe",
      "email": "john@therapyapp.com"
    },
    "scheduledAt": "2024-01-20T14:00:00Z",
    "durationMinutes": 50,
    "secureCallLink": "https://therapyapp.com/meeting/room123?token=abc123def456",
    "roomId": "room123",
    "timeUntilSession": "15 minutes"
  },
  "signature": "abc123def456..."
}
```

**Reminder Times:**
- `24h` - 24 hours before session
- `1h` - 1 hour before session (60 minutes)
- `15m` - 15 minutes before session

**Use Cases:**
- Send email reminder to client
- Send SMS reminder
- Post notification in Slack
- Update calendar with "start in 15 min" alert

---

## Security

### API Key Storage

- API keys are hashed with SHA256 before storage
- Raw keys are never logged or retrievable after creation
- Use `displayKey` (last 8 chars) for reference in UI only

### Webhook Signatures

Each webhook payload includes a `signature` field for verification:

```
signature = HMAC-SHA256(
  message = "{eventType}.{timestamp}.{JSON.stringify(payload)}",
  secret = keyHash
)
```

**Verification Example (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, keyHash) {
  const message = `${payload.event}.${payload.timestamp}.${JSON.stringify(payload.data)}`;
  const expectedSignature = crypto
    .createHmac('sha256', keyHash)
    .update(message)
    .digest('hex');
  
  return signature === expectedSignature;
}
```

### Best Practices

1. **Use HTTPS Only**: Webhook URLs must use `https://`
2. **Rotate Keys**: Regenerate API keys every 90 days
3. **Monitor Activity**: Review webhook logs for failed delivery attempts
4. **Rate Limiting**: Default is 1000 webhooks per hour per key
5. **Idempotency**: Handle duplicate webhook deliveries gracefully (check event IDs)

---

## Rate Limiting

Webhook delivery is rate-limited per API key:

- **Default**: 1000 webhooks per hour
- **Customizable**: Set on per-key basis
- **Queuing**: Failed webhooks are retried with exponential backoff
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining` sent in responses

---

## Error Handling

### Webhook Delivery Failures

If a webhook delivery fails:

1. Failure is logged in the webhook key's `failureCount`
2. `lastWebhookStatus` shows the HTTP status code
3. Webhook is retried (if applicable)
4. Admin dashboard shows failed deliveries for debugging

### Timeout

Webhook deliveries have a 5-second timeout. If your endpoint takes longer:

1. Return 200 OK immediately
2. Process the event asynchronously in background

---

## Testing

### Test Endpoint

Admin can send test webhooks from the dashboard or API:

```bash
curl -X POST https://your-api.onrender.com/api/webhooks/test \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{"keyId": "507f1f77bcf86cd799439011"}'
```

### Local Testing with Ngrok

Expose your local server to the internet for testing:

```bash
# Install ngrok
brew install ngrok

# Start ngrok on port 3000
ngrok http 3000

# Use ngrok URL in webhook config
# https://abc123.ngrok.io/webhook-handler
```

---

## Examples

### Example 1: Send Email via Zapier

```
Trigger: booking.created
↓
Action: Gmail
↓
Send email to therapist and client
```

[See full Zapier guide here](./ZAPIER_INTEGRATION_GUIDE.md)

### Example 2: Post to Slack

```
Trigger: booking.payment_verified
↓
Action: Slack
↓
Post in #notifications channel with secure link
```

### Example 3: Create Calendar Event

```
Trigger: booking.payment_verified
↓
Action: Google Calendar
↓
Create calendar event for therapist and client
```

---

## Troubleshooting

### Webhooks Not Delivered

1. Check webhook URL is correct and accessible
2. Verify API key is active: `GET /api/webhooks/keys/{id}`
3. Send test webhook: `POST /api/webhooks/test`
4. Check server logs for errors

### High Failure Rate

1. Check webhook endpoint response times (should be <5s)
2. Verify endpoint returns 2xx status code
3. Check rate limit hasn't been exceeded
4. Review error logs in admin dashboard

### Missing Events

1. Verify allowed events include the event type
2. Check if webhooks key is active (`active: true`)
3. Verify booking meets trigger criteria (status, timing)

---

## Support

For issues or questions:

1. Check server error logs: `tail -f server.log`
2. Review webhook history in admin dashboard
3. Contact platform administrator
4. Check webhook delivery status: `GET /api/webhooks/keys/{id}` → `lastWebhookStatus`

---

## Version History

- **v1.0** (Jan 2024): Initial release with 3 event types
  - `booking.created`
  - `booking.payment_verified`
  - `booking.reminder`
