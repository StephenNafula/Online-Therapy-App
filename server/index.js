require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const rawOrigins = process.env.CORS_ORIGIN || process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const ALLOWED_ORIGINS = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const signalingRoutes = require('./routes/signaling');
const usersRoutes = require('./routes/users');
const availabilityRoutes = require('./routes/availability');
const sessionNotesRoutes = require('./routes/sessionNotes');
const messagesRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Basic middleware
app.use(helmet());

app.use(cors({
  origin: function (origin, callback) {
    // allow non-browser (curl, server-to-server) requests with no origin
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy: origin not allowed'));
  },
  credentials: true
}));

// parse cookies (used for refresh token cookie)
app.use(cookieParser());
app.use(express.json());

// Global API limiter (per-IP). Provide a handler that logs and returns a clear JSON response
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  handler: (req, res /*, next */) => {
    // Log details for debugging (IP + endpoint)
    try {
      console.warn(`Rate limit exceeded - IP: ${req.ip} URL: ${req.originalUrl}`);
    } catch (err) {
      console.warn('Rate limit exceeded (could not read req details)');
    }

    // Suggest retry-after in seconds (windowMs / 1000)
    const retryAfter = Math.ceil(60);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ message: 'Too many requests — you are being rate limited. Try again in a minute.' });
  }
});

const RATE_LIMIT_BYPASS_PATHS = new Set(['/api/auth/login', '/api/auth/refresh', '/api/auth/logout']);
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();
  if (RATE_LIMIT_BYPASS_PATHS.has(req.path)) return next();
  return apiLimiter(req, res, next);
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Server is running', version: '1.0.0' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/signaling', signalingRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/session-notes', sessionNotesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/admin', adminRoutes);

io.on('connection', (socket) => {
  let socketUser = null;
  const token = socket.handshake && socket.handshake.auth && socket.handshake.auth.token;
  if (token) {
    try {
      socketUser = jwt.verify(token, JWT_SECRET);
      socket.user = socketUser;
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Invalid socket auth token supplied');
      }
    }
  }

  if (process.env.NODE_ENV !== 'test') {
    console.log('socket connected', socket.id, socketUser && socketUser.id);
  }

  socket.on('join-room', (room) => {
    // Allow guests (no socketUser) to join
    if (!room) return;
    socket.join(room);
    socket.to(room).emit('peer-joined', { socketId: socket.id });
  });

  socket.on('signal', ({ room, data }) => {
    // Allow guests to signal
    if (!room || !data) return;
    socket.to(room).emit('signal', { from: socket.id, data });
  });

  socket.on('leave-room', (room) => {
    if (!room) return;
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
