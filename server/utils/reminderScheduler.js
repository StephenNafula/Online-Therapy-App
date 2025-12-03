const Booking = require('../models/Booking');
const { dispatchWebhookEvent } = require('./webhookDispatcher');
const User = require('../models/User');

/**
 * Booking Reminder Scheduler
 * Sends reminders for upcoming bookings at specified intervals
 * Should be called periodically (e.g., every 5 minutes) by a cron job or interval
 */

// In-memory cache to prevent duplicate reminders
const sentReminders = new Map(); // key: bookingId_reminderType, value: timestamp

async function processBookingReminders() {
  try {
    const now = new Date();

    // Find bookings that are verified and scheduled for within the next X hours
    // We'll use a window: now to now + 24 hours
    const futureWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingBookings = await Booking.find({
      status: { $in: ['verified', 'scheduled'] },
      scheduledAt: { $gte: now, $lte: futureWindow }
    }).populate('client', 'name email').populate('therapist', 'name email');

    for (const booking of upcomingBookings) {
      // Check for 24-hour reminder
      const reminderKey24h = `${booking._id}_24h`;
      const hoursBefore24h = 24 * 60 * 60 * 1000;
      const reminderTime24h = new Date(booking.scheduledAt.getTime() - hoursBefore24h);

      if (now >= reminderTime24h && !sentReminders.has(reminderKey24h)) {
        await sendReminder(booking, '24h');
        sentReminders.set(reminderKey24h, now);
      }

      // Check for 1-hour reminder (15 minutes warning before meeting)
      const reminderKey1h = `${booking._id}_1h`;
      const hoursBefore1h = 1 * 60 * 60 * 1000;
      const reminderTime1h = new Date(booking.scheduledAt.getTime() - hoursBefore1h);

      if (now >= reminderTime1h && !sentReminders.has(reminderKey1h)) {
        await sendReminder(booking, '1h');
        sentReminders.set(reminderKey1h, now);
      }

      // Check for 15-minute reminder (active soon)
      const reminderKey15m = `${booking._id}_15m`;
      const hoursBefore15m = 15 * 60 * 1000;
      const reminderTime15m = new Date(booking.scheduledAt.getTime() - hoursBefore15m);

      if (now >= reminderTime15m && !sentReminders.has(reminderKey15m)) {
        await sendReminder(booking, '15m');
        sentReminders.set(reminderKey15m, now);
      }
    }

    // Cleanup old reminder entries (older than 48 hours)
    const cleanupThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    for (const [key, timestamp] of sentReminders) {
      if (timestamp < cleanupThreshold) {
        sentReminders.delete(key);
      }
    }
  } catch (err) {
    console.error('Error processing booking reminders:', err);
  }
}

/**
 * Send reminder webhook and prepare email data
 */
async function sendReminder(booking, reminderType) {
  try {
    const remindersText = {
      '24h': '24 hours',
      '1h': '1 hour',
      '15m': '15 minutes'
    };

    const reminderLabel = remindersText[reminderType] || reminderType;

    // Build reminder payload
    const reminderPayload = {
      bookingId: booking._id.toString(),
      reminderType, // '24h', '1h', or '15m'
      reminderLabel,
      client: {
        id: booking.client._id.toString(),
        name: booking.client.name,
        email: booking.client.email
      },
      therapist: {
        id: booking.therapist._id.toString(),
        name: booking.therapist.name,
        email: booking.therapist.email
      },
      scheduledAt: booking.scheduledAt.toISOString(),
      durationMinutes: booking.durationMinutes,
      secureCallLink: booking.secureCallLink,
      roomId: booking.roomId,
      timeUntilSession: reminderLabel
    };

    // Dispatch webhook event
    await dispatchWebhookEvent('booking.reminder', reminderPayload);

    console.log(`Reminder sent for booking ${booking._id} (${reminderType})`);
  } catch (err) {
    console.error(`Error sending reminder for booking ${booking._id}:`, err);
  }
}

/**
 * Start the reminder scheduler
 * Call this once on server startup
 */
function startReminderScheduler(intervalMs = 5 * 60 * 1000) {
  // Run every 5 minutes by default
  console.log(`Starting booking reminder scheduler (interval: ${intervalMs}ms)`);
  
  setInterval(() => {
    processBookingReminders().catch(err => {
      console.error('Unhandled error in reminder scheduler:', err);
    });
  }, intervalMs);

  // Run once immediately on startup
  processBookingReminders().catch(err => {
    console.error('Initial reminder scheduler run failed:', err);
  });
}

module.exports = {
  processBookingReminders,
  startReminderScheduler
};
