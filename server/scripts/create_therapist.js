require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

async function run() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/stitch_therapy';
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
  const email = process.argv[2] || 'hapiness@example.com';
  const name = process.argv[3] || 'hapiness';
  const password = process.argv[4] || 'changeme';

    const existing = await User.findOne({ email });
    if (existing) {
      console.log('Therapist already exists:', existing.email);
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 10);
  const user = new User({ name, email, passwordHash: hash, role: 'therapist', bio: 'Seeded default therapist' });
    await user.save();
    console.log('Created therapist:', email, 'password:', password);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create therapist', err);
    process.exit(1);
  }
}

run();
