# 🎯 Zapier Webhook Quick Start

## Your Zapier URL
```
https://hooks.zapier.com/hooks/catch/19997623/22j5pd7/
```

## Expected JSON Payload (booking.created)
```json
{
  "email": "client@example.com",
  "client_name": "John Smith",
  "service_name": "Consultation",
  "booking_date": "Thursday, Feb 15, 2024",
  "booking_time": "2:00 PM",
  "duration": "1 hour",
  "bookingId": "507f1f77bcf86cd799439011",
  "therapist_name": "Dr. Jane Doe",
  "therapist_email": "jane@therapyapp.com",
  "amount": 75,
  "currency": "USD"
}
```

## Setup Steps

### 1. Create API Key
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

**Save the `rawKey`!**

### 2. Test Webhook
```bash
curl -X POST https://your-api.onrender.com/api/webhooks/test \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{"keyId": "YOUR_KEY_ID"}'
```

Check Zapier task history → should see payload received

### 3. Create Zap in Zapier
1. Trigger: Webhooks by Zapier → "Catch Raw Hook"
2. Action: Gmail (send email)
3. Map fields to email template
4. Test → Enable

## Email Template Variables
- `{{email}}` - Client email
- `{{client_name}}` - Client name  
- `{{booking_date}}` - Session date
- `{{booking_time}}` - Session time
- `{{duration}}` - Duration (e.g., "1 hour")
- `{{therapist_name}}` - Therapist name
- `{{amount}}` - Cost
- `{{currency}}` - Currency code

## Example Email Subject
```
New Booking Confirmation: {{client_name}} - {{booking_date}} at {{booking_time}}
```

## Example Email Body
```
Hello {{therapist_name}},

New booking received:

Client: {{client_name}}
Email: {{email}}
Date: {{booking_date}}
Time: {{booking_time}}
Duration: {{duration}}
Cost: {{amount}} {{currency}}

Please log in to verify payment and send secure link.

Best regards,
Happiness Therapy System
```

## Status
✅ Payload format ready for Zapier
✅ All required fields present
✅ Date/time formatted correctly
✅ Ready for production

---

See `ZAPIER_WEBHOOK_SETUP.md` for complete setup guide
