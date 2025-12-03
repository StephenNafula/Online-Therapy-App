# Zapier Webhook Deployment Checklist

Deploy webhooks to production safely with this checklist.

---

## ✅ Pre-Deployment

- [ ] All tests passing locally: `npm test`
- [ ] No syntax errors: `node -c index.js`
- [ ] Changes committed: `git log --oneline -5`
- [ ] Remote branch up to date: `git pull origin master`
- [ ] Review webhook code:
  - [ ] `server/models/WebhookKey.js`
  - [ ] `server/routes/webhooks.js`
  - [ ] `server/utils/webhookDispatcher.js`
  - [ ] `server/utils/reminderScheduler.js`
  - [ ] Changes to `server/routes/bookings.js`

---

## 📦 Deployment Steps

### 1. Deploy to Render (or your hosting platform)

```bash
# Push to GitHub (should auto-trigger deployment)
git push origin master

# Monitor deployment
# Check Render logs: https://dashboard.render.com/
```

**Wait for:**
- Build to complete ✅
- Tests to pass ✅
- Server to restart ✅

### 2. Verify Deployment

```bash
# Check server is running
curl https://your-api.onrender.com/

# Response should include version info
```

### 3. Check MongoDB Connection

```bash
# Logs should show "Connected to MongoDB"
# Check Render logs
```

---

## 🔐 Configure Production Environment

### Set Required Environment Variables

In Render dashboard, add to `.env`:

```bash
# Existing vars (should already be set)
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
CORS_ORIGIN=https://your-frontend.vercel.app

# New for webhooks (optional - defaults work fine)
WEBHOOK_TIMEOUT=5000
WEBHOOK_REMINDER_INTERVAL=300000
```

---

## ✅ Post-Deployment Verification

### 1. Verify API Endpoints Exist

```bash
# List webhook keys (should be empty initially)
curl -X GET https://your-api.onrender.com/api/webhooks/keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return:
# {"success": true, "keys": []}
```

### 2. Create Test Webhook Key

**Via Dashboard** (if you have admin UI):
1. Log in as admin
2. Go to Settings → Webhooks
3. Create new API key
4. Set events to all three: `booking.created`, `booking.payment_verified`, `booking.reminder`

**Via API**:
```bash
curl -X POST https://your-api.onrender.com/api/webhooks/keys \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Zapier Integration",
    "webhookUrl": "https://hooks.zapier.com/hooks/catch/test/test",
    "allowedEvents": ["booking.created", "booking.payment_verified", "booking.reminder"]
  }'
```

**Response should include**:
- `rawKey`: Save this! (e.g., `sk_live_...`)
- `displayKey`: For reference
- `id`: For management

### 3. Test Webhook Delivery

```bash
# Send test webhook
curl -X POST https://your-api.onrender.com/api/webhooks/test \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keyId": "YOUR_WEBHOOK_KEY_ID"}'

# Should return success or error details
```

---

## 🚀 Set Up Zapier (First Time)

### 1. Create Zapier Account
- Go to [Zapier.com](https://zapier.com)
- Sign up or log in
- Click **Create → Create Zap**

### 2. Connect First Zap
- **Trigger**: Webhooks by Zapier → "Catch Raw Hook"
- Copy the Zapier webhook URL
- Update your webhook key in system with this URL

### 3. Follow Full Setup
- See **ZAPIER_INTEGRATION_GUIDE.md** for complete step-by-step

---

## 🧪 End-to-End Testing

### Test 1: Booking Creation Event

**Steps:**
1. Create a test booking via your booking form
2. Check server logs: `tail -f logs` → look for "booking.created"
3. Verify Zapier received webhook in task history
4. Check that test emails would be sent

**Expected:**
- Server: "Webhook ... dispatched successfully"
- Zapier: Task shows 200 OK response
- Emails: Configured actions execute

### Test 2: Payment Verification Event

**Steps:**
1. In admin panel, find a pending booking
2. Click "Verify Payment"
3. Check server logs: "booking.payment_verified" event
4. Verify Zapier task completed successfully

**Expected:**
- Client receives email with secure link
- Therapist receives payment confirmation
- Secure call link is present in payload

### Test 3: Reminder Event

**Steps:**
1. Create a booking scheduled for 25 minutes from now
2. Wait ~5 minutes (reminder scheduler interval)
3. Check server logs: "booking.reminder (15m)" event
4. Verify reminder email sent

**Expected:**
- Server: "Reminder sent for booking ..." 
- Zapier: "booking.reminder" event received
- Client + Therapist: Receive reminder email

---

## 🔍 Monitoring Setup

### View Webhook Statistics

```bash
curl -X GET https://your-api.onrender.com/api/webhooks/keys/YOUR_KEY_ID \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Check these fields:
# - successCount: How many succeeded
# - failureCount: How many failed
# - lastWebhookStatus: Last HTTP status code
# - lastWebhookAt: When last attempted
```

### Check Server Logs

```bash
# Render dashboard
# → Your service → Logs
# Filter for "webhook" keyword
```

### Monitor Zapier

- Each zap shows task history
- Click on a task to see:
  - Input data received
  - Output sent
  - Errors (if any)

---

## 🐛 Troubleshooting

### Issue: "Webhook key not found"

**Cause**: API key deleted or doesn't exist
**Fix**: 
1. List keys: `GET /api/webhooks/keys`
2. Create new key if needed

### Issue: "Invalid webhook URL"

**Cause**: URL is not valid HTTPS
**Fix**:
1. Ensure URL uses `https://`
2. Test URL in browser (should respond)
3. Verify Zapier webhook URL is correct

### Issue: Webhooks not sending emails

**Cause**: Zapier action not configured
**Fix**:
1. Check Zapier zap is enabled (toggle in top right)
2. Review task history for errors
3. Re-configure Gmail/email action

### Issue: High failure rate

**Cause**: Webhook endpoint slow or returning errors
**Fix**:
1. Check Zapier URL is responding
2. Monitor Zapier status page
3. Check rate limits not exceeded

---

## 📊 Daily Checks

After deployment, check daily for first week:

- [ ] **Day 1**: Create test booking, verify email sent
- [ ] **Day 2**: Verify payment, check secure link email
- [ ] **Day 3**: Wait for 15m reminder, check email
- [ ] **Day 4-7**: Monitor webhook stats, check failure count
- [ ] **Week 2+**: Reduce to weekly checks

---

## 🔄 Rollback Plan

If webhooks cause issues:

### Quick Disable
```bash
# Disable webhook key (keeps config, stops events)
curl -X PATCH https://your-api.onrender.com/api/webhooks/keys/KEY_ID \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{"active": false}'

# Email will still send manually, just no automation
```

### Full Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin master

# Render will auto-redeploy
```

---

## ✨ Success Indicators

You're good when:

- ✅ All tests passing in CI/CD
- ✅ API endpoints responding (GET, POST, PATCH, DELETE /webhooks/keys)
- ✅ Test webhook delivery succeeds (status 200)
- ✅ Real booking creates webhook event
- ✅ Zapier zaps enabled and receiving events
- ✅ Client receives welcome email on booking
- ✅ Client receives secure link email after payment
- ✅ Reminder emails sent before session

---

## 📝 Post-Deployment Documentation

### Update these docs with production URLs:

1. **ZAPIER_INTEGRATION_GUIDE.md**
   - Replace `https://your-api.onrender.com` with actual URL
   - Replace example JWT tokens with real format

2. **README.md**
   - Add link to webhook setup guide
   - Add section on automation

3. **Admin Dashboard** (if exists)
   - Add webhooks management UI
   - Add setup wizard

---

## 🎉 Deployment Complete!

Once all checks pass:

1. Announce to team: "Webhook automation deployed!"
2. Share [ZAPIER_QUICK_REFERENCE.md](ZAPIER_QUICK_REFERENCE.md) with team
3. Start onboarding users to create zaps
4. Monitor metrics daily for first week

---

## 📞 Support During Deployment

**If issues arise:**

1. Check server logs: Render dashboard → Logs
2. Verify webhook key is active: `GET /api/webhooks/keys`
3. Test webhook manually: `POST /api/webhooks/test`
4. Review Zapier task history
5. Check MongoDB is accessible: Look for connection errors in logs

**Emergency Contacts:**
- Platform Admin: [Your contact]
- Zapier Support: [Link]
- Render Support: [Link]

---

**Date Deployed**: [Fill in after deployment]
**API Version**: 1.0
**Status**: Production ✅
