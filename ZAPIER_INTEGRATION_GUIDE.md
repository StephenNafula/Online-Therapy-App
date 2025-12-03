# Zapier Automation Guide - Therapy Booking System

This guide explains how to set up automated email notifications for your therapy booking platform using Zapier and the webhook infrastructure.

## Overview

The system supports **three automated event triggers**:

1. **Booking Created** (`booking.created`) - When a client books a session
2. **Payment Verified** (`booking.payment_verified`) - When therapist approves payment
3. **Booking Reminder** (`booking.reminder`) - 24h, 1h, and 15-minute reminders before session

## Step 1: Create a Webhook API Key

### Via Admin Panel

1. Log in to your admin account
2. Navigate to **Settings → Webhooks & Integrations**
3. Click **Create New API Key**
4. Fill in:
   - **Name**: "Zapier Email Automation" (or similar)
   - **Webhook URL**: Leave for now; you'll get this from Zapier
   - **Events**: Select all three:
     - ✓ Booking Created
     - ✓ Payment Verified  
     - ✓ Booking Reminder
   - **Rate Limit**: 1000 (default)

5. Click **Generate Key**
6. **Important**: Copy the API key displayed (e.g., `sk_live_xxxxxxxx`). This appears only once!

### Via API Call

If you don't have admin UI yet, use curl:

```bash
curl -X POST https://your-api.onrender.com/api/webhooks/keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Zapier Email Automation",
    "webhookUrl": "https://hooks.zapier.com/hooks/catch/xxx/yyy",
    "allowedEvents": ["booking.created", "booking.payment_verified", "booking.reminder"],
    "provider": "zapier"
  }'
```

## Step 2: Create Zapier Zaps

### Zap 1: Booking Created → Email to Therapist

1. Go to [Zapier.com](https://zapier.com) and log in
2. Click **Create → Create Zap**
3. **Trigger**: 
   - Search and select **"Webhooks by Zapier" → "Catch Raw Hook"**
   - Copy the webhook URL provided by Zapier
4. **Update webhook key** in your admin panel with this Zapier URL
5. Back in Zapier, click **Test Trigger** → Create a test booking to verify data flows

6. **Action 1**: Email to Therapist
   - Click **+ → Gmail or Email (your email provider)**
   - Set up action:
     - **To**: `{{(trigger.data.therapist.email)}}`
     - **Subject**: `New Therapy Session Booked - {{trigger.data.client.name}}`
     - **Body Template**:
     ```
     Hello {{trigger.data.therapist.name}},
     
     A new therapy session has been booked with you:
     
     Client: {{trigger.data.client.name}}
     Email: {{trigger.data.client.email}}
     Scheduled: {{trigger.data.scheduledAt}}
     Duration: {{trigger.data.durationMinutes}} minutes
     Amount: {{trigger.data.currency}} {{trigger.data.amount}}
     
     Please log in to your dashboard to verify payment and send the secure call link.
     
     Best regards,
     System Admin
     ```
   - From: Use your therapist support email
   - Signature: Add your practice name

7. **Action 2**: Email to Client
   - Add another Gmail action:
     - **To**: `{{trigger.data.client.email}}`
     - **Subject**: `Your Therapy Session Booking Pending - {{trigger.data.therapist.name}}`
     - **Body Template**:
     ```
     Hello {{trigger.data.client.name}},
     
     Thank you for booking a therapy session!
     
     Session Details:
     - Therapist: {{trigger.data.therapist.name}}
     - Date & Time: {{trigger.data.scheduledAt}}
     - Duration: {{trigger.data.durationMinutes}} minutes
     - Cost: {{trigger.data.currency}} {{trigger.data.amount}}
     
     Your booking is PENDING. Follow the payment instructions in your original confirmation email.
     
     You will receive the secure call link once your payment has been verified.
     
     Questions? Reply to this email.
     
     Best regards,
     {{trigger.data.therapist.name}}
     ```

8. **Turn on the Zap** (toggle in top-right)

---

### Zap 2: Payment Verified → Email with Secure Link

1. Click **Create → Create Zap**
2. **Trigger**:
   - Select **"Webhooks by Zapier" → "Catch Raw Hook"**
   - Zapier will auto-detect this as a separate webhook endpoint
3. Filter for `booking.payment_verified` events (optional: add Filter to check `{{trigger.event}}` equals `booking.payment_verified`)

4. **Action**: Email to Client with Secure Link
   - Gmail action:
     - **To**: `{{trigger.data.client.email}}`
     - **Subject**: `Your Therapy Session Confirmed! Secure Link Inside 🔐`
     - **Body Template**:
     ```
     Hello {{trigger.data.client.name}},
     
     Great news! Your payment has been verified and your therapy session is now CONFIRMED.
     
     Session Details:
     - Therapist: {{trigger.data.therapist.name}}
     - Date & Time: {{trigger.data.scheduledAt}}
     - Duration: {{trigger.data.durationMinutes}} minutes
     - Cost: {{trigger.data.currency}} {{trigger.data.amount}} ✓ Paid
     
     YOUR SECURE CALL LINK (Join 5 minutes before your session):
     {{trigger.data.secureCallLink}}
     
     Important Security Notes:
     • This link is unique to your session and time-limited
     • Do not share this link with anyone
     • Hosting on a HIPAA-compliant secure platform
     • Audio-only for privacy and professionalism
     
     You will receive reminder emails before your session.
     
     See you soon!
     {{trigger.data.therapist.name}}
     ```

5. **Turn on the Zap**

---

### Zap 3: Booking Reminders → Auto-Send Reminders

1. Click **Create → Create Zap**
2. **Trigger**:
   - Select **"Webhooks by Zapier" → "Catch Raw Hook"**

3. **Filter** (Important: Only send reminders, not other events):
   - Click **+ Add Filter**
   - Field: `trigger.event`
   - Condition: `equals`
   - Value: `booking.reminder`

4. **Action**: Send Reminder Email to Client
   - Gmail action:
     - **To**: `{{trigger.data.client.email}}`
     - **Cc**: `{{trigger.data.therapist.email}}` (optional: so therapist gets visibility)
     - **Subject**: 
       ```
       [REMINDER] Your Therapy Session {{trigger.data.reminderLabel}} Away
       ```
     - **Body Template**:
     ```
     Hello {{trigger.data.client.name}},
     
     This is a friendly reminder that your therapy session with {{trigger.data.therapist.name}} is coming up in {{trigger.data.reminderLabel}}.
     
     📅 Session Time: {{trigger.data.scheduledAt}}
     🔐 Secure Call Link: {{trigger.data.secureCallLink}}
     
     Tips for Your Session:
     • Find a quiet, private space
     • Test your audio/microphone before joining
     • Join 5 minutes early to get settled
     • Keep your phone/device nearby
     
     See you soon!
     {{trigger.data.therapist.name}}
     ```

5. **Optional**: Add SMS Reminder
   - Click **+ Add Action**
   - Select **Twilio → Send SMS** (if you have Twilio set up)
   - Set message body with reminder details

6. **Turn on the Zap**

---

## Step 3: Test the Zaps

### Test Booking Created Trigger:
1. Create a test booking via your booking form
2. Check that both therapist and client receive emails within seconds
3. Verify all fields (name, time, amount) populated correctly

### Test Payment Verification:
1. In your admin panel, find a pending booking
2. Click **Verify Payment**
3. Client should receive secure link email immediately

### Test Reminders:
1. Create a booking scheduled for 15 minutes in the future
2. Wait for the reminder scheduler to run (every 5 minutes)
3. Client and therapist should receive reminder within ~5 minutes

---

## Webhook Event Payloads

### booking.created
```json
{
  "event": "booking.created",
  "timestamp": "2024-01-15T10:30:00Z",
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
    "amount": 75,
    "currency": "USD",
    "paymentMethod": "bank_transfer"
  }
}
```

### booking.payment_verified
```json
{
  "event": "booking.payment_verified",
  "timestamp": "2024-01-15T10:35:00Z",
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
    "amount": 75,
    "currency": "USD",
    "paymentProvider": "bank_transfer",
    "paymentReference": "REF-12345",
    "secureCallLink": "https://therapyapp.com/meeting/room123?token=abc123def456"
  }
}
```

### booking.reminder
```json
{
  "event": "booking.reminder",
  "timestamp": "2024-01-20T13:15:00Z",
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
  }
}
```

---

## Advanced Configuration

### Custom Email Templates

You can use Zapier's built-in email styling or advanced features:
- **HTML Editor**: Switch to HTML mode for custom styling
- **Conditional Logic**: Send different emails based on session type, therapist, etc.
- **Attachments**: Add forms or resources (e.g., intake forms)

### SMS Notifications (Optional)

To send SMS instead of/in addition to emails:

1. Add Twilio action to any zap
2. Use template fields:
   ```
   Hi {{trigger.data.client.name}}, your session with {{trigger.data.therapist.name}} starts in {{trigger.data.reminderLabel}}. Join here: {{trigger.data.secureCallLink}}
   ```

### Slack Notifications (Optional)

Notify your practice in Slack:

1. Add Slack action
2. Set channel to #therapist-alerts or similar
3. Message template:
   ```
   🔔 New booking from {{trigger.data.client.name}}
   With: {{trigger.data.therapist.name}}
   When: {{trigger.data.scheduledAt}}
   Amount: {{trigger.data.currency}} {{trigger.data.amount}}
   ```

---

## Troubleshooting

### Webhooks Not Firing

1. **Check webhook URL**: Ensure it's correctly entered in your admin panel
2. **Test webhook**: Click "Send Test" in admin panel
3. **Check Zapier logs**: In Zapier, view zap history for failed attempts
4. **Verify API key**: Ensure your API key is still active (not deleted/deactivated)

### Emails Not Being Sent

1. **Check email provider**: Gmail, Outlook must be authenticated in Zapier
2. **Review templates**: Ensure email address fields are populated with `{{trigger.data.client.email}}`
3. **Test trigger data**: Manually test with real booking event
4. **Check spam**: New automated emails may land in spam initially

### Reminders Not Working

1. **Check server logs**: Look for reminder scheduler output
2. **Verify booking status**: Only `verified` and `scheduled` bookings send reminders
3. **Check reminder window**: Reminders sent 24h, 1h, and 15m before session
4. **Restart server**: Reminder scheduler starts on server boot

---

## Security Best Practices

1. **Keep API Keys Private**: Never share your webhook API key
2. **Rotate Keys Quarterly**: Regenerate API keys for security
3. **Monitor Usage**: Check webhook logs in admin panel for suspicious activity
4. **Limit Events**: Only enable webhooks for events you need
5. **HTTPS Only**: Ensure webhook URL uses `https://` (Zapier requires it)
6. **Verify Signatures**: For custom integrations, verify webhook signatures using SHA256

---

## Support & Next Steps

- **Need help?** Check server logs: `tail -f server.log`
- **Add more events?** Create additional zaps by following the same pattern
- **Custom integration?** Use the webhook API directly in your own application
- **Questions?** Contact your platform administrator

---

Happy automating! 🎉
