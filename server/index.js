require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const signalingRoutes = require('./routes/signaling');
const usersRoutes = require('./routes/users');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Basic middleware
app.use(helmet());
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: CLIENT_ORIGIN }));

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
app.use('/api/', apiLimiter);
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/signaling', signalingRoutes);
app.use('/api/users', usersRoutes);

// Socket.IO for WebRTC signaling
io.on('connection', (socket) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('socket connected', socket.id);
  }

  socket.on('join-room', (room) => {
    socket.join(room);
    socket.to(room).emit('peer-joined', { socketId: socket.id });
  });

  socket.on('signal', ({ room, data }) => {
    socket.to(room).emit('signal', { from: socket.id, data });
  });

  socket.on('leave-room', (room) => {
    socket.leave(room);
    socket.to(room).emit('peer-left', { socketId: socket.id });
  });

  socket.on('disconnect', () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('socket disconnected', socket.id);
    }
  });
});

app.set('io', io);

// Export for testing
module.exports = { app, server, io };

// Only start if not in test mode
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  
  async function start() {
    try {
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/stitch_therapy';
      await mongoose.connect(mongoUri);
      if (process.env.NODE_ENV !== 'test') {
        console.log('Connected to MongoDB');
      }

        // Seed default admin and therapist users if they don't exist
        try {
          const User = require('./models/User');
          const bcrypt = require('bcrypt');

          async function ensureUser(email, name, password, role, bio) {
            const existing = await User.findOne({ email });
            if (existing) return existing;
            const hash = await bcrypt.hash(password, 10);
            const user = new User({ name, email, passwordHash: hash, role, bio });
            await user.save();
            console.log(`Seeded user: ${email} (${role})`);
            return user;
          }

          // Admin (superuser) - use seeded credentials (email must be valid for login)
          await ensureUser('mwaniki@example.com', 'mwaniki', process.env.ADMIN_PW || 'Nyashinski@254', 'admin', 'Seeded superuser admin');
          // Therapist - seeded therapist credentials
          await ensureUser('hapiness@example.com', 'hapiness', process.env.THERAPIST_PW || 'changeme', 'therapist', 'Seeded therapist user');
        } catch (seedErr) {
          console.error('Seeding users failed', seedErr);
        }
      server.listen(PORT, () => {
        if (process.env.NODE_ENV !== 'test') {
          console.log(`Server listening on port ${PORT}`);
        }
      });
    } catch (err) {
      console.error('Failed to start server', err);
      process.exit(1);
    }
  }

  start();
}
