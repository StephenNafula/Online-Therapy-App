const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { DateTime } = require('luxon');
const { auth, requireRole } = require('../utils/authMiddleware');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');
const PlatformSetting = require('../models/PlatformSetting');
const { dispatchWebhookEvent } = require('../utils/webhookDispatcher');
let nodemailer;
try { nodemailer = require('nodemailer'); } catch (e) { nodemailer = null; }
// lightweight room id generator to avoid ESM-only nanoid in this environment
function makeRoomId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const PLATFORM_NAME = process.env.PLATFORM_NAME || 'Happiness Therapy';

async function getSettingsDoc() {
  let settings = await PlatformSetting.findOne({ key: 'global' });
  if (!settings) {
    settings = await PlatformSetting.create({ key: 'global' });
  }
  return settings;
}

async function logBookingAudit(req, action, bookingId, details = {}) {
  if (!req?.user?.id) return;
  try {
    await AuditLog.create({
      actor: req.user.id,
      action,
      resourceType: 'Booking',
      resourceId: bookingId,
      details,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  } catch (err) {
    console.error('Audit log failed', err);
  }
}

function createTransporter() {
  if (!nodemailer || !process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
}

async function sendEmailTemplate({ to, subject, text, html }) {
  if (!to) return;
  const transporter = createTransporter();
  if (!transporter) {
    console.log('SMTP not configured; would have sent email', { to, subject });
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.ADMIN_EMAIL || 'no-reply@example.com',
      to,
      subject,
      text,
      html
    });
  } catch (err) {
    console.error('Failed to send transactional email', err);
  }
}

function formatSessionDateTime(booking, therapist) {
  const tz = therapist?.timezone || 'UTC';
  const dt = DateTime.fromJSDate(new Date(booking.scheduledAt)).setZone(tz);
  return {
    date: dt.toFormat('cccc, LLL dd, yyyy'),
    time: dt.toFormat('hh:mm a'),
    timezone: tz
  };
}

function defaultInstructionBlock() {
  return `Bank Transfer:
- Account Name: [Platform/Practice Name]
- Account Number: [Account Number]
- Sort Code/Routing: [Sort Code/Routing Number]
- Reference: Please use your name and session date (e.g., [Client Name] [Date]).

Alternative Method (PayPal/Venmo):
- Address: [Alternative Payment Address]
- Note: Include your name and session date in the payment note.`;
}

function buildPendingPaymentEmail({ booking, therapist, client, settings }) {
  const session = formatSessionDateTime(booking, therapist);
  const amount = booking.externalPayment?.amount || '[Session Cost]';
  const currency = booking.externalPayment?.currency || '[Currency]';
  const instructions = settings.manualPaymentInstructions?.trim() || defaultInstructionBlock();
  const subject = 'Your Therapy Session Booking is Pending - Action Required';
  const text = `Dear ${client.name || '[Client Name]'},

Thank you for booking a session with ${therapist.name || '[Therapist Name]'} on the ${PLATFORM_NAME} platform.

Your session is currently PENDING approval. To confirm your booking, you must complete the manual payment process outlined below.

Session Details:
- Therapist: ${therapist.name || '[Therapist Name]'}
- Date: ${session.date}
- Time: ${session.time} (${session.timezone})
- Session Type: Audio-Only Call
- Cost: ${amount} ${currency}

Manual Payment Instructions (Action Required):
${instructions}

Important: Your booking will only be confirmed once your payment has been manually verified. Please allow up to 24 hours for verification. You will receive a separate "Secure Audio Call Link" email once your payment is confirmed.

If you have any questions, please reply to this email.

Thank you,
The ${PLATFORM_NAME} Team`;

  const html = `
  <p>Dear ${client.name || '[Client Name]'},</p>
  <p>Thank you for booking a session with <strong>${therapist.name || '[Therapist Name]'}</strong> on the ${PLATFORM_NAME} platform.</p>
  <p>Your session is currently <strong>PENDING</strong> approval. To confirm your booking, please complete the manual payment process below.</p>
  <h3>Your Pending Session Details</h3>
  <table style="border-collapse:collapse;">
    <tr><td style="padding:4px 8px;"><strong>Therapist:</strong></td><td>${therapist.name || '[Therapist Name]'}</td></tr>
    <tr><td style="padding:4px 8px;"><strong>Date:</strong></td><td>${session.date}</td></tr>
    <tr><td style="padding:4px 8px;"><strong>Time:</strong></td><td>${session.time} (${session.timezone})</td></tr>
    <tr><td style="padding:4px 8px;"><strong>Session Type:</strong></td><td>Audio-Only Call</td></tr>
    <tr><td style="padding:4px 8px;"><strong>Cost:</strong></td><td>${amount} ${currency}</td></tr>
  </table>
  <h3>Manual Payment Instructions (Action Required)</h3>
  <ol>
    <li>
      <strong>Bank Transfer:</strong>
      <ul>
        <li>Account Name: [Platform/Practice Name]</li>
        <li>Account Number: [Account Number]</li>
        <li>Sort Code/Routing: [Sort Code/Routing Number]</li>
        <li>Reference: Please use your name and the session date (e.g., [Client Name] [Date]).</li>
      </ul>
    </li>
    <li>
      <strong>Alternative Method (e.g., PayPal/Venmo):</strong>
      <ul>
        <li>Address: [Alternative Payment Address]</li>
        <li>Note: Please include your name and the session date in the payment note.</li>
      </ul>
    </li>
  </ol>
  <p>Important: Your booking will only be confirmed once your payment has been manually verified by our team. Please allow up to 24 hours for verification.</p>
  <p>You will receive a separate <strong>Secure Audio Call Link</strong> email once your payment is confirmed and your booking is approved.</p>
  <p>If you have any questions, please reply to this email.</p>
  <p>Thank you,<br/>The ${PLATFORM_NAME} Team</p>
  `;
  return { subject, text, html };
}

function buildConfirmationEmail({ booking, therapist, client, settings }) {
  const session = formatSessionDateTime(booking, therapist);
  const amount = booking.externalPayment?.amount || '[Session Cost]';
  const currency = booking.externalPayment?.currency || '[Currency]';
  const link = booking.secureCallLink;
  const availableMinutes = settings.audioCall?.reminderMinutes || 5;
  const subject = 'Your Therapy Session is Confirmed! Secure Audio Call Link Enclosed';
  const text = `Dear ${client.name || '[Client Name]'},

Great news! Your payment for the session with ${therapist.name || '[Therapist Name]'} has been successfully verified, and your booking is now CONFIRMED.

Session Details:
- Therapist: ${therapist.name || '[Therapist Name]'}
- Date: ${session.date}
- Time: ${session.time} (${session.timezone})
- Session Type: Audio-Only Call
- Cost: ${amount} ${currency} (Paid)

Secure Session Link (active ${availableMinutes} minutes before your appointment):
${link}

Security Note: This link is unique to your session and is hosted on our secure, HIPAA-compliant platform. Do not share it with anyone.

You will receive a final reminder 24 hours before your session.

We look forward to your session.

Sincerely,
The ${PLATFORM_NAME} Team`;

  const html = `
  <p>Dear ${client.name || '[Client Name]'},</p>
  <p>Great news! Your payment for the session with <strong>${therapist.name || '[Therapist Name]'}</strong> has been successfully verified, and your booking is now <strong>CONFIRMED</strong>.</p>
  <h3>Your Confirmed Session Details</h3>
  <table style="border-collapse:collapse;">
    <tr><td style="padding:4px 8px;"><strong>Therapist:</strong></td><td>${therapist.name || '[Therapist Name]'}</td></tr>
    <tr><td style="padding:4px 8px;"><strong>Date:</strong></td><td>${session.date}</td></tr>
    <tr><td style="padding:4px 8px;"><strong>Time:</strong></td><td>${session.time} (${session.timezone})</td></tr>
    <tr><td style="padding:4px 8px;"><strong>Session Type:</strong></td><td>Audio-Only Call</td></tr>
    <tr><td style="padding:4px 8px;"><strong>Cost:</strong></td><td>${amount} ${currency} (Paid)</td></tr>
  </table>
  <h3>How to Join Your Secure Audio Call</h3>
  <p>Please use the unique, secure link below to join your session at the scheduled time. The link will become active ${availableMinutes} minutes before your appointment.</p>
  <p><a href="${link}" style="color:#2563eb;font-weight:bold;">Secure Session Link</a></p>
  <p><strong>Security Note:</strong> This link is unique to your session and is hosted on our secure, HIPAA-compliant platform. Do not share it with anyone.</p>
  <p><strong>Reminder:</strong> You will receive a final reminder email/SMS 24 hours before your session.</p>
  <p>We look forward to your session.</p>
  <p>Sincerely,<br/>The ${PLATFORM_NAME} Team</p>
  `;
  return { subject, text, html };
}

// Create a booking (client)
router.post('/',
  auth(true),
  [body('therapistId').isMongoId().withMessage('therapistId must be a valid id'), body('scheduledAt').isISO8601().withMessage('scheduledAt must be an ISO date')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { therapistId, scheduledAt, durationMinutes, externalPayment } = req.body;
      // Check for overlapping bookings (strict rejection)
      try {
        const therapist = await User.findById(therapistId).lean();
        const tz = (therapist && therapist.timezone) ? therapist.timezone : 'UTC';
        const desiredStart = DateTime.fromISO(new Date(scheduledAt).toISOString(), { zone: tz });
        const desiredEnd = desiredStart.plus({ minutes: durationMinutes || 50 });
        // query bookings in a window that could overlap
        const windowStart = desiredStart.minus({ hours: 24 }).toJSDate();
        const windowEnd = desiredEnd.plus({ hours: 24 }).toJSDate();
        const existing = await Booking.find({ therapist: therapistId, scheduledAt: { $gte: windowStart, $lte: windowEnd }, status: { $ne: 'cancelled' } }).lean();
        for (const b of existing) {
          const bStart = DateTime.fromJSDate(new Date(b.scheduledAt)).setZone(tz);
          const bDur = (b.durationMinutes && Number(b.durationMinutes)) ? Number(b.durationMinutes) : 50;
          const bEnd = bStart.plus({ minutes: bDur });
          if (desiredStart < bEnd && bStart < desiredEnd) {
            return res.status(409).json({ message: 'Requested time overlaps an existing booking. Please choose another time.' });
          }
        }
      } catch (ovErr) {
        console.error('Overlap check failed', ovErr);
      }
      const booking = new Booking({ client: req.user.id, therapist: therapistId, scheduledAt, durationMinutes, externalPayment, roomId: makeRoomId() });
      await booking.save();
      // emit booking created event for realtime notifications
      try {
        const io = req.app.get('io');
        if (io) {
          const populated = await Booking.findById(booking._id).populate('client', 'name email').populate('therapist', 'name email');
          io.emit('booking:created', populated);
        }
      } catch (emitErr) {
        console.error('Failed to emit booking created', emitErr);
      }
      // Dispatch webhook event for booking creation
      try {
        const populated = await Booking.findById(booking._id).populate('client', 'name email').populate('therapist', 'name email');
        await dispatchWebhookEvent('booking.created', {
          bookingId: booking._id.toString(),
          client: {
            id: populated.client._id.toString(),
            name: populated.client.name,
            email: populated.client.email
          },
          therapist: {
            id: populated.therapist._id.toString(),
            name: populated.therapist.name,
            email: populated.therapist.email
          },
          scheduledAt: booking.scheduledAt.toISOString(),
          durationMinutes: booking.durationMinutes,
          amount: booking.externalPayment?.amount,
          currency: booking.externalPayment?.currency
        });
      } catch (webhookErr) {
        console.error('Failed to dispatch booking.created webhook', webhookErr);
      }
      res.json(booking);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Guest booking (no auth) - create or link a client user and create booking
const rateLimit = require('express-rate-limit');

// stricter limiter for guest bookings to prevent abuse (5 per hour per IP)
const guestBookingLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many booking attempts from this IP, please try again later.' });

router.post('/guest-booking', guestBookingLimiter,
  [
    body('client.fullName').trim().escape().notEmpty().withMessage('Full name is required'),
    body('client.email').normalizeEmail().isEmail().withMessage('Valid email is required'),
    body('client.phone').trim().isMobilePhone('any').withMessage('Valid phone number is required'),
    body('session.preferredDate').trim().notEmpty().withMessage('Preferred date is required'),
    body('session.preferredTime').trim().notEmpty().withMessage('Preferred time is required'),
    body('session.therapyType').trim().escape().notEmpty().withMessage('Therapy type is required'),
    body('payment.amountPaid').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    body('payment.method').trim().escape().notEmpty().withMessage('Payment method is required'),
    body('consent').isBoolean().withMessage('Consent must be provided and true')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { client: clientInfo, session, payment } = req.body;

      // Find or create client user by email (server-side validation ensures sanitized values)
      // Ensure consent was provided
      if (!req.body.consent) return res.status(400).json({ message: 'Informed consent is required to create a booking' });

      // Find or create client user by email
      let clientUser = await User.findOne({ email: clientInfo.email });
      if (!clientUser) {
        const randomPass = Math.random().toString(36).slice(2, 10);
        const hash = await bcrypt.hash(randomPass, 10);
        clientUser = new User({ name: clientInfo.fullName, email: clientInfo.email, passwordHash: hash, role: 'client' });
        await clientUser.save();
      }

      // Determine therapist: use provided therapistId or fallback to any therapist in DB
      let therapistId = req.body.therapistId;
      if (!therapistId) {
        const therapist = await User.findOne({ role: 'therapist' });
        if (!therapist) return res.status(400).json({ message: 'No therapists available' });
        therapistId = therapist._id;
      }

      // Build scheduledAt from preferredDate + preferredTime if provided separately
      let scheduledAt = null;
      if (session.preferredDate && session.preferredTime) {
        // combine into an ISO string (assume local date/time provided by client)
        scheduledAt = new Date(`${session.preferredDate}T${session.preferredTime}`);
      } else if (session.scheduledAt) {
        scheduledAt = new Date(session.scheduledAt);
      }
      if (!scheduledAt || isNaN(scheduledAt.getTime())) return res.status(400).json({ message: 'Invalid scheduled date/time' });

      const durationMinutes = session.sessionDuration || session.durationMinutes || 50;
      // Strict overlap check for guest booking
      try {
        const therapistUser = await User.findById(therapistId).lean();
        const tz = (therapistUser && therapistUser.timezone) ? therapistUser.timezone : 'UTC';
        const desiredStart = DateTime.fromISO(scheduledAt.toISOString(), { zone: tz });
        const desiredEnd = desiredStart.plus({ minutes: durationMinutes });
        const windowStart = desiredStart.minus({ hours: 24 }).toJSDate();
        const windowEnd = desiredEnd.plus({ hours: 24 }).toJSDate();
        const existing = await Booking.find({ therapist: therapistId, scheduledAt: { $gte: windowStart, $lte: windowEnd }, status: { $ne: 'cancelled' } }).lean();
        for (const b of existing) {
          const bStart = DateTime.fromJSDate(new Date(b.scheduledAt)).setZone(tz);
          const bDur = (b.durationMinutes && Number(b.durationMinutes)) ? Number(b.durationMinutes) : 50;
          const bEnd = bStart.plus({ minutes: bDur });
          if (desiredStart < bEnd && bStart < desiredEnd) {
            return res.status(409).json({ message: 'Requested time overlaps an existing booking. Please choose another time.' });
          }
        }
      } catch (ovErr) {
        console.error('Guest overlap check failed', ovErr);
      }

      const booking = new Booking({
        client: clientUser._id,
        therapist: therapistId,
        scheduledAt,
        durationMinutes,
        externalPayment: {
          provider: payment.method,
          amount: payment.amountPaid,
          reference: payment.reference || ''
        },
        roomId: makeRoomId(),
        notes: session.note || ''
      });

      await booking.save();
      // emit booking created for realtime notifications
      try {
        const io = req.app.get('io');
        if (io) {
          const populated = await Booking.findById(booking._id).populate('client', 'name email').populate('therapist', 'name email');
          io.emit('booking:created', populated);
        }
      } catch (emitErr) {
        console.error('Failed to emit guest booking created', emitErr);
      }
      // Dispatch webhook event for booking creation
      try {
        const populated = await Booking.findById(booking._id).populate('client', 'name email').populate('therapist', 'name email');
        await dispatchWebhookEvent('booking.created', {
          bookingId: booking._id.toString(),
          isGuestBooking: true,
          client: {
            id: populated.client._id.toString(),
            name: populated.client.name,
            email: populated.client.email
          },
          therapist: {
            id: populated.therapist._id.toString(),
            name: populated.therapist.name,
            email: populated.therapist.email
          },
          scheduledAt: booking.scheduledAt.toISOString(),
          durationMinutes: booking.durationMinutes,
          amount: booking.externalPayment?.amount,
          currency: booking.externalPayment?.currency,
          paymentMethod: booking.externalPayment?.provider
        });
      } catch (webhookErr) {
        console.error('Failed to dispatch guest booking.created webhook', webhookErr);
      }

      // Send manual payment instructions email
      try {
        const settings = await getSettingsDoc();
        const therapist = await User.findById(therapistId).lean();
        if (clientUser.email) {
          const emailPayload = buildPendingPaymentEmail({
            booking,
            therapist,
            client: clientUser,
            settings
          });
          await sendEmailTemplate({ to: clientUser.email, ...emailPayload });
        }
      } catch (emailErr) {
        console.error('Failed to send pending payment email', emailErr);
      }
      res.json({ success: true, bookingId: booking._id, _id: booking._id });
    } catch (err) {
      console.error('Guest booking error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// List bookings for the logged-in user
router.get('/', auth(true), async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = {};
    if (role === 'therapist') query = { therapist: id };
    else if (role === 'admin') query = {}; // admin sees all bookings
    else query = { client: id };
    const bookings = await Booking.find(query).populate('client', 'name email').populate('therapist', 'name email bio specialties');
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Therapist can update status (admin control)
router.patch('/:id/status', auth(true), requireRole('therapist'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    booking.status = req.body.status || booking.status;
    await booking.save();
    await logBookingAudit(req, 'update_status', booking._id, { status: booking.status });
    // emit booking updated
    try {
      const io = req.app.get('io');
      if (io) {
        const populated = await Booking.findById(booking._id).populate('client', 'name email').populate('therapist', 'name email');
        io.emit('booking:updated', populated);
      }
    } catch (emitErr) {
      console.error('Failed to emit booking updated', emitErr);
    }
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Therapist can start a call (update timestamp)
router.patch('/:id/start-call', auth(true), requireRole('therapist'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    booking.callStartedAt = new Date();
    await booking.save();
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Therapist can end a call for a booking (emit room end-call event)
router.patch('/:id/end', auth(true), requireRole('therapist'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    booking.status = 'completed';
    await booking.save();
    // emit to socket room to inform peers
    const io = req.app.get('io');
    if (io && booking.roomId) {
      io.to(booking.roomId).emit('signal', { data: { type: 'end-call' } });
    }
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Therapist can mute/unmute clients in the booking's room
router.patch('/:id/mute', auth(true), requireRole('therapist'), async (req, res) => {
  try {
    const { muted } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    const io = req.app.get('io');
    if (io && booking.roomId) {
      io.to(booking.roomId).emit('signal', { data: { type: 'mute', muted: !!muted } });
    }
    res.json({ success: true, muted: !!muted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify payment and attach transaction reference (therapist or admin)
router.post('/:id/verify-payment', auth(true), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (req.user.role !== 'therapist' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient role' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });

    const override = req.body && req.body.override === true;
    if (booking.status === 'verified') {
      if (!override) {
        return res.status(409).json({ message: 'Booking already verified. Contact an admin to override.' });
      }
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can override verified bookings' });
      }
    }

    const { provider, reference, amount, currency } = req.body || {};
    booking.externalPayment = booking.externalPayment || {};
    if (provider) booking.externalPayment.provider = provider;
    if (reference) booking.externalPayment.reference = reference;
    if (amount) booking.externalPayment.amount = amount;
    if (currency) booking.externalPayment.currency = currency;

    // mark verified
    booking.status = 'verified';

    // generate a secure call token/link for the client if not present
    try {
      if (!booking.secureCallLink || override) {
        const token = crypto.randomBytes(24).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        // Token expiry: default to scheduledAt + 2h (safe window); override with settings if provided
        const settings = await getSettingsDoc();
        const scheduledAt = booking.scheduledAt ? new Date(booking.scheduledAt) : new Date();
        const expiryMs = 2 * 60 * 60 * 1000; // 2 hours
        const expiresAt = new Date(scheduledAt.getTime() + expiryMs);
        booking.secureCallTokenHash = tokenHash;
        booking.secureCallExpiresAt = expiresAt;
        booking.secureCallUsed = false;
        booking.secureCallOneTime = true;
        const clientOrigin = process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:5173';
        booking.secureCallLink = `${clientOrigin.replace(/\/$/, '')}/meeting/${booking.roomId}?token=${token}`;
      }
    } catch (genErr) {
      console.error('Failed to generate secure call link', genErr);
    }

    await booking.save();
    await logBookingAudit(req, override ? 'verify_payment_override' : 'verify_payment', booking._id, {
      provider,
      reference,
      amount,
      currency
    });

    // emit booking updated
    try {
      const io = req.app.get('io');
      if (io) {
        const populated = await Booking.findById(booking._id).populate('client', 'name email');
        io.emit('booking:updated', populated);
      }
    } catch (emitErr) {
      console.error('Failed to emit booking updated after verify', emitErr);
    }

    // Dispatch webhook event for payment verification
    try {
      const populated = await Booking.findById(booking._id).populate('client', 'name email').populate('therapist', 'name email');
      await dispatchWebhookEvent('booking.payment_verified', {
        bookingId: booking._id.toString(),
        client: {
          id: populated.client._id.toString(),
          name: populated.client.name,
          email: populated.client.email
        },
        therapist: {
          id: populated.therapist._id.toString(),
          name: populated.therapist.name,
          email: populated.therapist.email
        },
        scheduledAt: booking.scheduledAt.toISOString(),
        durationMinutes: booking.durationMinutes,
        amount: booking.externalPayment?.amount,
        currency: booking.externalPayment?.currency,
        paymentProvider: booking.externalPayment?.provider,
        paymentReference: booking.externalPayment?.reference,
        secureCallLink: booking.secureCallLink
      });
    } catch (webhookErr) {
      console.error('Failed to dispatch booking.payment_verified webhook', webhookErr);
    }

    // Send confirmation email with secure link
    try {
      const settings = await getSettingsDoc();
      const client = await User.findById(booking.client).lean();
      const therapist = await User.findById(booking.therapist).lean();
      if (client?.email && therapist) {
        const emailPayload = buildConfirmationEmail({ booking, therapist, client, settings });
        await sendEmailTemplate({ to: client.email, ...emailPayload });
      }
    } catch (emailErr) {
      console.error('Error while attempting to notify client of secure call link', emailErr);
    }

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Therapist/Admin can reschedule a booking
router.patch('/:id/reschedule', auth(true), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (req.user.role !== 'therapist' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient role' });
    }
    const { scheduledAt } = req.body || {};
    if (!scheduledAt) return res.status(400).json({ message: 'scheduledAt is required' });
    const newDate = new Date(scheduledAt);
    if (isNaN(newDate.getTime())) return res.status(400).json({ message: 'Invalid scheduledAt value' });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });

    if (req.user.role === 'therapist' && booking.therapist.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only reschedule your own bookings' });
    }
    if (booking.status === 'verified' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Verified bookings can only be rescheduled by an admin' });
    }

    // overlap check
    try {
      const therapist = await User.findById(booking.therapist).lean();
      const tz = (therapist && therapist.timezone) ? therapist.timezone : 'UTC';
      const desiredStart = DateTime.fromISO(newDate.toISOString(), { zone: tz });
      const desiredEnd = desiredStart.plus({ minutes: booking.durationMinutes || 50 });
      const windowStart = desiredStart.minus({ hours: 24 }).toJSDate();
      const windowEnd = desiredEnd.plus({ hours: 24 }).toJSDate();
      const existing = await Booking.find({
        therapist: booking.therapist,
        _id: { $ne: booking._id },
        scheduledAt: { $gte: windowStart, $lte: windowEnd },
        status: { $ne: 'cancelled' }
      }).lean();
      for (const b of existing) {
        const bStart = DateTime.fromJSDate(new Date(b.scheduledAt)).setZone(tz);
        const bDur = (b.durationMinutes && Number(b.durationMinutes)) ? Number(b.durationMinutes) : 50;
        const bEnd = bStart.plus({ minutes: bDur });
        if (desiredStart < bEnd && bStart < desiredEnd) {
          return res.status(409).json({ message: 'Requested time overlaps an existing booking.' });
        }
      }
    } catch (ovErr) {
      console.error('Reschedule overlap check failed', ovErr);
    }

    booking.scheduledAt = newDate;
    if (booking.status !== 'verified') {
      booking.status = 'scheduled';
    }
    await booking.save();
    await logBookingAudit(req, 'reschedule_booking', booking._id, { scheduledAt: newDate });

    try {
      const io = req.app.get('io');
      if (io) {
        const populated = await Booking.findById(booking._id).populate('client', 'name email').populate('therapist', 'name email');
        io.emit('booking:updated', populated);
      }
    } catch (emitErr) {
      console.error('Failed to emit booking reschedule', emitErr);
    }

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Therapist can add session notes
router.patch('/:id/notes', auth(true), requireRole('therapist'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    const { notes } = req.body || {};
    booking.notes = typeof notes === 'string' ? notes : booking.notes;
    await booking.save();
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reports: summary counts (weekly/monthly)
router.get('/reports/summary', auth(true), async (req, res) => {
  try {
    // only admin or therapist allowed to view reports
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (req.user.role !== 'admin' && req.user.role !== 'therapist') {
      return res.status(403).json({ message: 'Insufficient role' });
    }

    const range = req.query.range || 'monthly'; // 'weekly' or 'monthly'
    const now = new Date();
    let start;
    if (range === 'weekly') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    } else {
      start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }

    const match = { createdAt: { $gte: start } };
    const total = await Booking.countDocuments(match);
    const verified = await Booking.countDocuments({ ...match, status: 'verified' });
    const scheduled = await Booking.countDocuments({ ...match, status: 'scheduled' });
    const completed = await Booking.countDocuments({ ...match, status: 'completed' });
    const cancelled = await Booking.countDocuments({ ...match, status: 'cancelled' });

    res.json({ success: true, range, total, verified, scheduled, completed, cancelled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
