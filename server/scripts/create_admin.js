require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

async function run() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/stitch_therapy';
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    const email = process.argv[2] || 'mwaniki@example.com';
    const name = process.argv[3] || 'mwaniki';
    const password = process.argv[4] || 'Nyashinski@254';

    const existing = await User.findOne({ email });
    if (existing) {
      console.log('Admin already exists:', existing.email);
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, passwordHash: hash, role: 'admin', bio: 'Seeded admin user' });
    await user.save();
    console.log('Created admin:', email, 'password:', password);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin', err);
    process.exit(1);
  }
}

run();
