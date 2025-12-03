# Zapier Webhook Configuration

## Your Zapier Webhook Details

**Webhook URL**: `https://hooks.zapier.com/hooks/catch/19997623/22j5pd7/`

## Step 1: Create API Key in Your App

Use the webhook URL from Zapier to create an API key in your system:

```bash
curl -X POST https://your-api.onrender.com/api/webhooks/keys \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Zapier Booking Confirmation",
    "webhookUrl": "https://hooks.zapier.com/hooks/catch/19997623/22j5pd7/",
    "allowedEvents": ["booking.created"],
    "provider": "zapier"
  }'
```

**Response** will include:
```json
{
  "success": true,
  "key": {
    "id": "YOUR_KEY_ID",
    "displayKey": "sk_live_xxxxxxxx",
    "rawKey": "sk_live_...",
    "webhookUrl": "https://hooks.zapier.com/...",
    "allowedEvents": ["booking.created"],
    "createdAt": "2024-12-03T..."
  }
}
```

**⚠️ Save the `rawKey`** — it will never be shown again!

## Step 2: Webhook Payload Format

When a booking is created, your app will send this JSON to Zapier:

```json
{
  "email": "client@example.com",
  "client_name": "John Smith",
  "service_name": "Consultation",
  "booking_date": "Thursday, Feb 15, 2024",
  "booking_time": "09:00 AM",
  "duration": "1 hour",
  "bookingId": "507f1f77bcf86cd799439011",
  "therapist_name": "Dr. Jane Doe",
  "therapist_email": "jane@therapyapp.com",
  "amount": 75,
  "currency": "USD"
}
```

### Field Explanations

| Field | Description | Example |
|-------|-------------|---------|
| `email` | Client's email address | `"jane@example.com"` |
| `client_name` | Client's full name | `"Jane Smith"` |
| `service_name` | Type of service booked | `"Consultation"` |
| `booking_date` | Formatted date of session | `"Thursday, Feb 15, 2024"` |
| `booking_time` | Formatted time of session in client's timezone | `"2:00 PM"` |
| `duration` | Human-readable duration | `"1 hour"` |
| `bookingId` | Unique booking ID (for reference) | `"507f1f77bcf86cd799439011"` |
| `therapist_name` | Therapist's name | `"Dr. John Doe"` |
| `therapist_email` | Therapist's email | `"john@therapyapp.com"` |
| `amount` | Session cost | `75` |
| `currency` | Currency code | `"USD"` |

## Step 3: Test Webhook Delivery

To test if webhooks are working:

```bash
# Send test webhook to Zapier
curl -X POST https://your-api.onrender.com/api/webhooks/test \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keyId": "YOUR_KEY_ID"}'
```

Check your Zapier task history to confirm the webhook was received.

## Step 4: Create a Zap in Zapier

1. Go to [Zapier.com](https://zapier.com)
2. Create a new Zap
3. **Trigger**: Webhooks by Zapier → "Catch Raw Hook"
4. In the webhook URL field, paste: `https://hooks.zapier.com/hooks/catch/19997623/22j5pd7/`
5. **Action**: Configure your email/SMS/notification action
6. Test and enable the zap

## Webhook Event Flow

When a client books a session:

```
1. Client Creates Booking
   ↓
2. Your App Validates Booking
   ↓
3. booking.created Event Triggered
   ↓
4. WebhookDispatcher Sends JSON to Zapier
   ↓
5. Zapier Receives Payload
   ↓
6. Zapier Zap Executes (e.g., sends email)
   ↓
7. Email Delivered to Client & Therapist
```

## Troubleshooting

### Webhook Not Sending

1. **Verify API key is active**:
   ```bash
   curl -X GET https://your-api.onrender.com/api/webhooks/keys/YOUR_KEY_ID \
     -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
   ```

2. **Check webhook URL is correct**: Ensure no typos in Zapier URL

3. **Check server logs**: Look for "Webhook dispatched" or error messages

4. **Test webhook delivery**:
   ```bash
   curl -X POST https://your-api.onrender.com/api/webhooks/test \
     -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
     -d '{"keyId": "YOUR_KEY_ID"}'
   ```

### Zapier Not Receiving Data

1. Check Zapier task history for errors
2. Verify webhook URL has no typos
3. Look for HTTP status codes in your app logs
4. Test with a real booking creation

### Email Not Sent from Zapier

1. Verify your Zap is enabled (toggle in Zapier)
2. Check Gmail/email provider is authenticated in Zapier
3. Review Zap action configuration (email field set to `email` field from webhook)
4. Check spam folder for emails

## Field Mapping in Zapier

When setting up email action in Zapier, map these fields:

- **To**: `email` (from webhook)
- **Subject**: e.g., `New Booking: {{client_name}} on {{booking_date}}`
- **Body**: Use fields like:
  - `{{client_name}}` - Client name
  - `{{booking_date}}` - Session date
  - `{{booking_time}}` - Session time
  - `{{duration}}` - Session duration
  - `{{therapist_name}}` - Therapist name
  - `{{amount}}` - Cost

Example email subject:
```
New Booking Confirmation for {{client_name}} - {{booking_date}} at {{booking_time}}
```

Example email body:
```
Hello {{therapist_name}},

New booking:
- Client: {{client_name}} ({{email}})
- Date: {{booking_date}}
- Time: {{booking_time}}
- Duration: {{duration}}
- Cost: {{amount}} USD

Please log in to verify payment and send secure link.

Best regards,
Happiness Therapy System
```

## API Key Management

View all webhook keys:
```bash
curl -X GET https://your-api.onrender.com/api/webhooks/keys \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

Update webhook key (e.g., disable):
```bash
curl -X PATCH https://your-api.onrender.com/api/webhooks/keys/YOUR_KEY_ID \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{"active": false}'
```

Delete webhook key:
```bash
curl -X DELETE https://your-api.onrender.com/api/webhooks/keys/YOUR_KEY_ID \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

## Next Steps

1. ✅ Create API key with Zapier webhook URL
2. ✅ Deploy your app with webhook support
3. ✅ Create test booking to trigger webhook
4. ✅ Verify payload arrives in Zapier
5. ✅ Set up Zap action (email, SMS, etc.)
6. ✅ Test end-to-end with real booking
7. ✅ Enable Zap for production

---

**Webhook Status**: ✅ Active and ready to use
**Last Updated**: December 3, 2024
**Payload Format Version**: 1.0
