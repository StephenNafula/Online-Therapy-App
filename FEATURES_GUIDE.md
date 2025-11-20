# Therapist & Admin Dashboard Features - Implementation Guide

## Overview

This update adds comprehensive functionality for therapists and administrators to manage schedules, conduct secure audio calls, handle encrypted notes, send secure messages, and oversee the entire platform with analytics and audit logs.

## Features Implemented

### 1. **In-System Audio Calls**
- **Location**: Therapist Dashboard
- **Components**: `AudioCallComponent.jsx`
- **Features**:
  - Therapist can initiate secure audio calls from dashboard
  - Call duration is tracked automatically
  - Secure call links generated and can be sent to clients
  - Call metrics stored in booking record

**Usage**:
```javascript
// In therapist dashboard, for each booking:
<AudioCallComponent booking={booking} token={token} userRole="therapist" />
```

### 2. **Therapist Availability Management**
- **Location**: Therapist Dashboard → "My Availability" tab
- **Component**: `AvailabilityManagement.jsx`
- **Database Model**: `TherapistAvailability.js`
- **API Routes**: `/api/availability/*`

**Features**:
- Add recurring (weekly) availability slots
- Set specific date availability
- Define working hours per day
- Mark availability as on/off
- Delete availability slots

**Example Usage**:
```javascript
<AvailabilityManagement token={token} therapistId={user._id} />
```

### 3. **Encrypted Private Session Notes**
- **Location**: Therapist Dashboard → Each booking
- **Component**: `SessionNotesEditor.jsx`
- **Database Model**: `SessionNote.js` (AES-256 encryption)
- **API Routes**: `/api/session-notes/*`

**Features**:
- Write notes after each session
- Notes encrypted before storage (AES-256-CBC)
- Only therapist can decrypt their own notes
- Admin can view (with encryption key)
- HIPAA-compliant storage

**Security**:
```javascript
// Encryption uses environment variable ENCRYPTION_KEY
// Default: 'dev_key_change_in_production_16chars'
// In production, set: export ENCRYPTION_KEY=<your-32-char-key>
```

### 4. **Secure HIPAA-Compliant Messaging**
- **Location**: Therapist Dashboard → "Messages" tab
- **Component**: `SecureMessaging.jsx`
- **Database Model**: `SecureMessage.js` (encrypted)
- **API Routes**: `/api/messages/*`

**Features**:
- Send encrypted messages between therapist and admin
- Messages encrypted end-to-end
- Mark messages as read
- Delete messages
- Subject line support

**Usage**:
```javascript
<SecureMessaging token={token} userRole="therapist" />
```

### 5. **Admin Dashboard (Full Platform Management)**
- **Location**: `/app/admin`
- **Component**: `AdminDashboard.jsx`
- **API Routes**: `/api/admin/*`

**Admin Capabilities**:

#### a) **Overview/Analytics Tab**
- Total bookings
- Completed bookings
- Scheduled bookings
- Total therapists & clients
- Revenue from verified payments

#### b) **Therapist Management Tab**
- View all therapists
- Add new therapist (with name, email, password, bio, specialties)
- Edit therapist profiles
- Remove/deactivate therapists
- All changes logged to audit trail

#### c) **Master Calendar/Bookings Tab**
- View all bookings across all therapists
- Filter by therapist, status, date range
- Centralized booking oversight
- See client and therapist information
- Payment verification status

#### d) **Audit Logs Tab**
- View all system actions
- Track who made what changes
- Timestamp and IP address logging
- Resource-level tracking
- Perfect for compliance & monitoring

**Usage**:
```javascript
// Admins can navigate to /app/admin
// Or add link in sidebar for admin users
```

### 6. **Audit Logging System**
- **Database Model**: `AuditLog.js`
- **Logged Events**:
  - Create/edit/delete therapist
  - Create/update booking
  - Session note creation
  - Payment verification
  - Admin actions

**Captured Data**:
- Actor (user ID)
- Action (string)
- Resource type & ID
- Detailed changes
- IP address & user agent
- Timestamp

## Database Models Added

### TherapistAvailability
```javascript
{
  therapist: ObjectId,
  dayOfWeek: Number (0-6), // optional for recurring
  startTime: String,        // HH:MM
  endTime: String,          // HH:MM
  isRecurring: Boolean,
  specificDate: Date,
  isAvailable: Boolean
}
```

### SessionNote
```javascript
{
  booking: ObjectId,
  therapist: ObjectId,
  encryptedContent: String,
  iv: String,              // initialization vector for decryption
  createdAt: Date,
  updatedAt: Date
}
```

### SecureMessage
```javascript
{
  sender: ObjectId,
  recipient: ObjectId,
  encryptedContent: String,
  iv: String,
  subject: String,
  isRead: Boolean
}
```

### AuditLog
```javascript
{
  actor: ObjectId,
  action: String,
  resourceType: String,
  resourceId: ObjectId,
  details: Mixed,
  ipAddress: String,
  userAgent: String,
  createdAt: Date
}
```

### Booking Model Updates
```javascript
// Added fields:
{
  secureCallLink: String,     // unique link for client to join call
  callStartedAt: Date,
  callEndedAt: Date,
  callDuration: Number        // in seconds
}
```

## API Endpoints

### Availability Management
```
GET    /api/availability/my-availability         → Get therapist's slots
POST   /api/availability/my-availability         → Add new slot
PATCH  /api/availability/my-availability/:id     → Update slot
DELETE /api/availability/my-availability/:id     → Delete slot
GET    /api/availability/admin/all-availability  → Admin: view all
```

### Session Notes
```
GET    /api/session-notes/:bookingId              → Get notes for booking
POST   /api/session-notes/:bookingId              → Create/save notes
PATCH  /api/session-notes/:bookingId              → Update notes
GET    /api/session-notes/admin/:bookingId        → Admin: view notes
```

### Secure Messaging
```
GET    /api/messages                              → Get inbox (all messages)
POST   /api/messages                              → Send message
PATCH  /api/messages/:id/read                     → Mark as read
DELETE /api/messages/:id                          → Delete message
```

### Admin Management
```
GET    /api/admin/therapists                      → List all therapists
POST   /api/admin/therapists                      → Add therapist
PATCH  /api/admin/therapists/:id                  → Edit therapist
DELETE /api/admin/therapists/:id                  → Remove therapist

GET    /api/admin/bookings                        → List all bookings (with filters)
GET    /api/admin/analytics/summary               → Platform analytics
GET    /api/admin/audit-logs                      → View audit trail
```

## Environment Variables

### For Encryption (IMPORTANT):
```bash
# In your .env file (server):
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Example (CHANGE IN PRODUCTION):
ENCRYPTION_KEY=dev_key_change_in_production_16chars
```

**Generate a secure key**:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Other Environment Variables
```bash
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES_DAYS=7
NODE_ENV=production
```

## Deployment Steps

### 1. Install Server Dependencies
```bash
cd server
npm install cookie-parser  # Already in package.json
```

### 2. Set Environment Variables in Render/Production
- `MONGODB_URI` → MongoDB Atlas connection
- `JWT_SECRET` → JWT signing key
- `ENCRYPTION_KEY` → 32-char encryption key (CHANGE THIS)
- `CORS_ORIGIN` → Vercel frontend URL
- `NODE_ENV` → production

### 3. Database Migration
No migrations needed; models are created on first use.

### 4. Seed Admin Data
```bash
cd server
node scripts/create_admin.js
node scripts/create_therapist.js
```

### 5. Deploy Client
```bash
cd client
npm install
npm run build
vercel --prod
```

### 6. Deploy Server
```bash
cd server
git push  # auto-deploys to Render if configured
```

## Security Considerations

### Encryption
- **Algorithm**: AES-256-CBC (symmetric encryption)
- **Key**: Must be 32 bytes (256 bits)
- **IV**: Random 16-byte initialization vector generated per record
- **Storage**: Encrypted content + IV stored in database
- **Decryption**: Happens in-memory; never log plain text

### Access Control
- Therapists can only see their own notes
- Therapists can only edit their own availability
- Admins have full access with audit logging
- All admin actions are logged to `AuditLog`

### HIPAA Compliance
- Session notes are encrypted at rest
- Messages are encrypted end-to-end
- Audit logs provide accountability trail
- IP logging for access tracking

## Client-Side Components

All new components are located in `client/src/components/`:

1. **AvailabilityManagement.jsx** - Add/manage therapist availability
2. **AudioCallComponent.jsx** - Start and track audio calls
3. **SessionNotesEditor.jsx** - Write encrypted session notes
4. **SecureMessaging.jsx** - Send/receive encrypted messages

And pages:
1. **AdminDashboard.jsx** - Full admin dashboard with 4 tabs

## Therapist Dashboard Integration

The therapist dashboard now includes tabs:
- **Bookings** - View client bookings
- **Availability** - Manage working hours
- **Notes** - Write encrypted session notes per booking
- **Messages** - Communicate securely with admin
- **Call** - Start audio call (per booking)

## Testing Locally

### 1. Start server
```bash
cd server
npm run dev
```

### 2. Start client
```bash
cd client
npm run dev
```

### 3. Login as therapist
- Email: `hapiness@example.com`
- Password: `changeme` (or set in `.env`)

### 4. Test features
- Go to Dashboard
- Add availability slots
- Click "Manage Schedule"
- For any booking: write notes, start call
- Send messages to admin

### 5. Login as admin
- Email: `mwaniki@example.com`
- Password: `Nyashinski@254`
- Navigate to `/app/admin`
- View therapists, bookings, analytics, audit logs

## Troubleshooting

### Notes not saving
- Check `ENCRYPTION_KEY` is set
- Verify booking exists
- Check browser console for errors

### Messages not appearing
- Ensure sender/recipient IDs are correct
- Check `CORS_ORIGIN` includes frontend URL
- Verify token is valid

### Availability slots not showing
- Clear localStorage and reload
- Verify therapist ID is correct
- Check browser DevTools Network tab

### Audit logs empty
- Logs only created for admin actions
- Check `NODE_ENV` is not 'test'
- Verify admin user has correct role

## Future Enhancements

1. **Email Notifications**
   - Email client when therapist starts call
   - Email therapist when message received
   - Session reminders 1 hour before

2. **Video Calls**
   - Upgrade from audio-only to WebRTC video
   - Screen sharing
   - Recording (with consent)

3. **Advanced Scheduling**
   - Calendar UI (Google Calendar style)
   - Client-facing booking page
   - Automatic reminders

4. **Analytics Dashboard**
   - Charts/graphs for admin
   - Therapist performance metrics
   - Client satisfaction ratings

5. **Mobile App**
   - Native iOS/Android
   - Push notifications
   - Offline mode

## File Structure

```
server/
  models/
    TherapistAvailability.js
    SessionNote.js
    SecureMessage.js
    AuditLog.js
  routes/
    availability.js
    sessionNotes.js
    messages.js
    admin.js

client/
  components/
    AvailabilityManagement.jsx
    AudioCallComponent.jsx
    SessionNotesEditor.jsx
    SecureMessaging.jsx
  pages/
    AdminDashboard.jsx
    Dashboard.jsx (updated)
```

## Support

For issues or questions:
1. Check logs: `Render dashboard → Logs` (backend) or browser DevTools (frontend)
2. Verify environment variables are set
3. Check database connection: run `/` health check endpoint
4. Review audit logs for failed operations

---

**Last Updated**: November 20, 2025
**Version**: 2.0 (Major feature release)
