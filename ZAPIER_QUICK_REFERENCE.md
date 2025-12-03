# Zapier Automation - Quick Reference

## 🎯 Three Automation Events

### 1️⃣ **Booking Created**
```
Client Books Session
    ↓
booking.created event
    ↓
Email to Therapist: "New booking request from [client]"
Email to Client: "Booking pending - awaiting payment verification"
```

**Payload includes:**
- Client name, email, ID
- Therapist name, email
- Session date/time
- Session cost

**Best for:**
- Initial confirmation emails
- Therapist notification of new inquiries
- Calendar invitations
- CRM integration

---

### 2️⃣ **Payment Verified**
```
Therapist Approves Payment
    ↓
booking.payment_verified event
    ↓
Email to Client: "Payment confirmed! Here's your secure call link"
Email to Therapist: "Payment verified - session ready"
```

**Payload includes:**
- Payment confirmation details
- Payment reference number
- **Secure call link** (unique to this session)
- Session details

**Best for:**
- Sending secure call link
- Payment confirmation receipt
- Session confirmation
- Calendar blocking

---

### 3️⃣ **Automatic Reminders**
```
System Automatically Sends:
    ↓
24 hours before → "Reminder: Your session is tomorrow"
1 hour before   → "Reminder: Your session starts in 1 hour"
15 min before   → "Alert: Session starting in 15 minutes"
```

**Payload includes:**
- Reminder type (24h, 1h, 15m)
- Secure call link
- Time until session

**Best for:**
- Reduce no-shows with reminders
- Send SMS alerts
- Post Slack notifications
- Post to therapist calendar

---

## 🚀 Setup in 3 Steps

### Step 1: Create API Key
Admin creates key in system:
```bash
POST /api/webhooks/keys
Name: "Zapier"
URL: https://hooks.zapier.com/catch/xxx/yyy
Events: All 3 (booking.created, payment_verified, reminder)
```

**Save the API key!** (shown only once)

### Step 2: Create Zapier Zaps
1. Trigger: Webhooks by Zapier → Catch Raw Hook
2. Actions: Gmail/SMS/Slack/etc.
3. Test & Enable

### Step 3: Test
Create a test booking → Check for emails ✅

---

## 📧 Email Templates (Zapier)

### Booking Created → Therapist
```
Subject: New Therapy Session Booked - {{trigger.data.client.name}}

Hello {{trigger.data.therapist.name}},

New booking:
- Client: {{trigger.data.client.name}} ({{trigger.data.client.email}})
- Date: {{trigger.data.scheduledAt}}
- Duration: {{trigger.data.durationMinutes}} min
- Cost: {{trigger.data.currency}} {{trigger.data.amount}}

Log in to verify payment and send secure link.
```

### Payment Verified → Client
```
Subject: Your Session is Confirmed! 🔐 Secure Link Inside

Hello {{trigger.data.client.name}},

Great news! Payment confirmed.

Join your session:
{{trigger.data.secureCallLink}}

Session: {{trigger.data.scheduledAt}}
Therapist: {{trigger.data.therapist.name}}

⚠️ Don't share this link. It's unique to your session.
```

### Reminder (15m) → Client
```
Subject: Your Session Starts in 15 Minutes! ⏰

Hi {{trigger.data.client.name}},

Your session with {{trigger.data.therapist.name}} 
starts in 15 minutes.

Join here: {{trigger.data.secureCallLink}}

See you soon!
```

---

## 🔐 Security Checklist

- ✅ API key is hashed (SHA256)
- ✅ Webhook URLs are HTTPS only
- ✅ Each event signed with HMAC-SHA256
- ✅ Rate limited (1000 events/hour default)
- ✅ Admin-only access control
- ✅ Failed deliveries logged and tracked

---

## 🧪 Testing

### Test Webhook Delivery
```bash
curl -X POST https://your-api/api/webhooks/test \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"keyId": "..."}'
```

### View Webhook Stats
```bash
curl -X GET https://your-api/api/webhooks/keys/{keyId} \
  -H "Authorization: Bearer YOUR_JWT"
```

Response shows:
- `successCount` - How many events sent successfully
- `failureCount` - Failed attempts
- `lastWebhookStatus` - Last HTTP status code

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| No emails sent | Check Zapier zap is enabled |
| Webhook not firing | Test webhook, check API key active |
| Reminders not sent | Wait 5 min (scheduler interval), check booking status |
| High failure rate | Check webhook URL returns 200 OK within 5s |
| Events missing | Verify allowed events include the event type |

---

## 📱 Advanced: SMS Reminders

Add to any reminder zap:

**Trigger**: booking.reminder

**Action**: Twilio SMS
```
To: {{trigger.data.client.phone}}
Message: Hi {{trigger.data.client.name}}, 
your session starts in {{trigger.data.reminderLabel}}. 
Join: {{trigger.data.secureCallLink}}
```

---

## 📞 Slack Notifications

Add to payment verified zap:

**Action**: Slack Post Message
```
Channel: #therapist-alerts
Message: ✅ Payment verified for {{trigger.data.client.name}}
Therapist: {{trigger.data.therapist.name}}
When: {{trigger.data.scheduledAt}}
```

---

## 📊 Event Payload Reference

All events include:
```json
{
  "event": "booking.created",           // Event type
  "timestamp": "2024-01-15T10:30:00Z",  // When it happened
  "id": "uuid-xxx",                     // Unique event ID
  "signature": "hmac-xxx",              // For verification
  "data": { ... }                       // Event-specific data
}
```

---

## ✨ Key Features

- ✅ 3 automation triggers (creation, payment, reminders)
- ✅ Automatic reminders (24h, 1h, 15m)
- ✅ Secure link included in emails
- ✅ Therapist + Client emails
- ✅ Rate limited & monitored
- ✅ SMS, Email, Slack support
- ✅ Full audit trail

---

## 📚 Full Documentation

- **Setup Guide**: See `ZAPIER_INTEGRATION_GUIDE.md`
- **API Docs**: See `WEBHOOK_API_DOCUMENTATION.md`
- **Implementation**: See `ZAPIER_WEBHOOK_IMPLEMENTATION_SUMMARY.md`

---

## 🎯 Common Workflows

### Workflow 1: Email Confirmation
```
booking.created 
  → Send therapist notification
  → Send client "pending payment" email

booking.payment_verified
  → Send client secure link
  → Send therapist confirmation
```

### Workflow 2: SMS Reminders + Slack Alerts
```
booking.reminder (24h)  → SMS to client
booking.reminder (1h)   → SMS + Slack to therapist  
booking.reminder (15m)  → SMS to client only
```

### Workflow 3: Calendar Integration
```
booking.payment_verified
  → Create Google Calendar event
  → Add both client and therapist as invitees
```

---

**All set!** Start automating your therapy practice. 🚀
