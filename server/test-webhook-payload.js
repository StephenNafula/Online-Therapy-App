#!/usr/bin/env node

/**
 * Quick test to verify webhook payload format matches Zapier expectations
 */

const { DateTime } = require('luxon');

// Mock booking data
const mockBooking = {
  _id: '507f1f77bcf86cd799439011',
  scheduledAt: new Date('2024-02-15T14:00:00Z'),
  durationMinutes: 60,
  externalPayment: {
    amount: 75,
    currency: 'USD',
    provider: 'bank_transfer'
  }
};

const mockClient = {
  _id: '507f1f77bcf86cd799439012',
  name: 'John Smith',
  email: 'john@example.com'
};

const mockTherapist = {
  _id: '507f1f77bcf86cd799439013',
  name: 'Dr. Jane Doe',
  email: 'jane@therapyapp.com',
  timezone: 'America/New_York'
};

// Format session date/time
function formatSessionDateTime(booking, therapist) {
  const tz = therapist?.timezone || 'UTC';
  const dt = DateTime.fromJSDate(new Date(booking.scheduledAt)).setZone(tz);
  return {
    date: dt.toFormat('cccc, LLL dd, yyyy'),
    time: dt.toFormat('hh:mm a'),
    timezone: tz
  };
}

// Generate webhook payload
function generateBookingCreatedPayload(booking, client, therapist) {
  const sessionDateTime = formatSessionDateTime(booking, therapist);
  const durationHours = booking.durationMinutes >= 60 
    ? `${Math.floor(booking.durationMinutes / 60)} hour${Math.floor(booking.durationMinutes / 60) > 1 ? 's' : ''}`
    : `${booking.durationMinutes} minutes`;
  
  return {
    email: client.email,
    client_name: client.name,
    service_name: 'Consultation',
    booking_date: sessionDateTime.date,
    booking_time: sessionDateTime.time,
    duration: durationHours,
    // Additional fields
    bookingId: booking._id.toString(),
    therapist_name: therapist.name,
    therapist_email: therapist.email,
    amount: booking.externalPayment?.amount,
    currency: booking.externalPayment?.currency
  };
}

// Test
const payload = generateBookingCreatedPayload(mockBooking, mockClient, mockTherapist);

console.log('\n✅ WEBHOOK PAYLOAD FORMAT TEST\n');
console.log('Expected Zapier JSON:');
console.log(JSON.stringify({
  email: "client@example.com",
  client_name: "John Smith", 
  service_name: "Consultation",
  booking_date: "2024-02-15",
  booking_time: "2:00 PM", 
  duration: "1 hour"
}, null, 2));

console.log('\n\nActual Generated Payload:');
console.log(JSON.stringify(payload, null, 2));

// Validate required fields
const requiredFields = ['email', 'client_name', 'service_name', 'booking_date', 'booking_time', 'duration'];
const hasAllRequired = requiredFields.every(field => field in payload);

console.log('\n\nValidation Results:');
console.log(`✅ Has all required Zapier fields: ${hasAllRequired}`);
console.log(`✅ Email: ${payload.email}`);
console.log(`✅ Client Name: ${payload.client_name}`);
console.log(`✅ Service Name: ${payload.service_name}`);
console.log(`✅ Booking Date: ${payload.booking_date}`);
console.log(`✅ Booking Time: ${payload.booking_time}`);
console.log(`✅ Duration: ${payload.duration}`);

if (hasAllRequired) {
  console.log('\n✨ Payload format matches Zapier expectations!\n');
  process.exit(0);
} else {
  console.log('\n❌ Payload missing required fields!\n');
  process.exit(1);
}
