# 🏗️ Architecture Overview - Happiness Online Therapy App

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER BROWSERS                                 │
│              (Therapists, Admins, Guests)                           │
└────────────────────────────┬────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                                 │
│        https://happiness-therapy-app-frontend.vercel.app            │
│                                                                       │
│  ┌──────────────────────────────────────────────────────┐           │
│  │  React 18 + Vite                                     │           │
│  │  ✓ Home, About, Services, Contact Pages             │           │
│  │  ✓ Guest Booking Flow                               │           │
│  │  ✓ Therapist Dashboard                              │           │
│  │  ✓ Admin Dashboard                                  │           │
│  │  ✓ Real-time Notifications (Socket.io)              │           │
│  │  ✓ Therapist Slots Management                       │           │
│  └──────────────────────────────────────────────────────┘           │
│                                                                       │
│  Environment Variables:                                             │
│  • VITE_API_URL=https://...onrender.com/api                        │
│  • VITE_SOCKET_URL=https://...onrender.com                         │
└────────────────────────────┬────────────────────────────────────────┘
                              │
                              │ REST API + WebSocket
                              │ HTTPS
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     RENDER (Backend)                                 │
│          https://happiness-therapy-api.onrender.com                 │
│                                                                       │
│  ┌──────────────────────────────────────────────────────┐           │
│  │  Node.js + Express.js                               │           │
│  │  ✓ REST API Endpoints                               │           │
│  │    - POST /api/auth/login                           │           │
│  │    - POST /api/bookings/guest-booking               │           │
│  │    - GET  /api/bookings                             │           │
│  │    - PATCH /api/bookings/:id/status                 │           │
│  │    - PATCH /api/bookings/:id/verify-payment         │           │
│  │    - PATCH /api/bookings/:id/notes                  │           │
│  │  ✓ WebSocket (Socket.io) for Real-time Updates     │           │
│  │  ✓ JWT Authentication & Authorization              │           │
│  │  ✓ CORS enabled for Vercel                          │           │
│  └──────────────────────────────────────────────────────┘           │
│                                                                       │
│  Environment Variables:                                             │
│  • MONGODB_URI=mongodb+srv://...                                    │
│  • JWT_SECRET=your-secret-key                                       │
│  • CORS_ORIGIN=https://happiness-therapy-app-frontend.vercel.app   │
│  • PORT=4000                                                        │
│  • NODE_ENV=production                                              │
└────────────────────────────┬────────────────────────────────────────┘
                              │
                              │ Mongoose ODM
                              │ MongoDB Protocol
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│              MONGODB ATLAS (Cloud Database)                          │
│     https://mongodb.com/cloud/atlas                                 │
│                                                                       │
│  Cluster: happiness-therapy-app                                    │
│  Database: happiness-therapy-app                                   │
│                                                                       │
│  Collections:                                                       │
│  ┌─────────────────────────────────────────────────────┐           │
│  │ users                                               │           │
│  │ {                                                   │           │
│  │   _id, name, email, password, role, createdAt      │           │
│  │ }                                                   │           │
│  └─────────────────────────────────────────────────────┘           │
│                                                                       │
│  ┌─────────────────────────────────────────────────────┐           │
│  │ bookings                                            │           │
│  │ {                                                   │           │
│  │   _id, client, therapist, scheduledAt, status,     │           │
│  │   externalPayment, notes, roomId, createdAt        │           │
│  │ }                                                   │           │
│  └─────────────────────────────────────────────────────┘           │
│                                                                       │
│  Connection String (Production):                                   │
│  mongodb+srv://user:pass@cluster.mongodb.net/...                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Workflow

### Phase 1: Local Development
```
Your Machine
├── MongoDB (localhost:27017)
│   └── happiness-therapy-app (local)
├── Express Server (localhost:4000)
│   └── npm start
└── React Frontend (localhost:5173)
    └── npm run dev
```

### Phase 2: MongoDB Atlas Setup
```
Local Server (localhost:4000)
    ↓
MongoDB Atlas (Cloud)
└── Connection: mongodb+srv://user:pass@cluster.mongodb.net/...
```

### Phase 3: Vercel Deployment
```
GitHub Repository
    ↓
Vercel (Auto-deploys on push)
    ├── Build: npm run build
    ├── Output: dist/
    └── URL: https://...vercel.app
```

### Phase 4: Render Deployment
```
GitHub Repository
    ↓
Render (Auto-deploys on push)
    ├── Build: npm install
    ├── Start: npm start
    └── URL: https://...onrender.com
```

### Phase 5: Full Integration
```
┌────────────────────────────────────────┐
│   https://...vercel.app (Frontend)    │
└────────────────┬──────────────────────┘
                 │
    ┌────────────┴───────────┐
    ↓                        ↓
  REST API            WebSocket
    │                        │
    └────────────┬───────────┘
                 ↓
    https://...onrender.com (Backend)
                 │
    ┌────────────┴───────────┐
    ↓                        
MongoDB Atlas (Cloud)
```

---

## Data Flow Examples

### 1. Guest Booking Flow
```
1. User visits Vercel frontend
2. Clicks "Book Now (No Login)"
3. Selects service → navigates to /booking
4. Enters email & payment details
5. Frontend POST to Render: /api/bookings/guest-booking
6. Backend stores in MongoDB Atlas
7. Admin receives Socket.io notification
8. Admin verifies payment
9. Therapist receives notification
10. Session happens, status updated to "completed"
```

### 2. Real-time Notification Flow
```
1. Client establishes WebSocket to Render backend
2. Backend listens for events: booking:created, booking:updated
3. Admin accepts booking
4. Backend emits: booking:updated
5. Socket.io broadcasts to Vercel frontend
6. Notification appears instantly (no page refresh)
```

### 3. Therapist Slots Management Flow
```
1. Therapist logs in (JWT from Render)
2. Opens Dashboard → "Manage Slots"
3. Adds availability slots (date/time/duration)
4. Data stored in localStorage (client-side for now)
   - Future: POST to /api/therapists/:id/slots
5. Clients see available therapists
6. Client books a slot
7. Therapist notified via Socket.io
```

---

## Environment Variables Summary

### Client (.env.production)
```env
VITE_API_URL=https://happiness-therapy-api.onrender.com/api
VITE_SOCKET_URL=https://happiness-therapy-api.onrender.com
```

### Server (.env)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/happiness-therapy-app
JWT_SECRET=your-secure-secret-key
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://happiness-therapy-app-frontend.vercel.app
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTPS/TLS Layer                           │
│            (All communication encrypted)                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Frontend (Vercel)                          │
├─────────────────────────────────────────────────────────────┤
│  • No secrets stored in frontend code                        │
│  • API calls authenticated with JWT token                    │
│  • Environment variables injected at build time              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Backend (Render)                           │
├─────────────────────────────────────────────────────────────┤
│  • JWT verification on every protected route                 │
│  • Role-based access control (Admin, Therapist, Guest)      │
│  • CORS validation against Vercel URL only                   │
│  • Secrets in environment variables (not in code)            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                Database (MongoDB Atlas)                      │
├─────────────────────────────────────────────────────────────┤
│  • Network access limited to Render server                   │
│  • Database user with minimal privileges                     │
│  • Passwords never stored in plaintext (bcrypt)              │
│  • IP whitelist enabled                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Scaling Considerations

### Current Setup (Free Tier)
- Vercel: ~50 concurrent users
- Render: Shared CPU, 512MB RAM
- MongoDB Atlas: M0 (512MB storage, 10K concurrent)

### When You Need to Scale
1. **Upgrade MongoDB**: M2 or larger cluster
2. **Upgrade Render**: Add more resources or use Standard plan
3. **Add Caching**: Redis for session management
4. **Load Balancing**: Distribute across multiple Render instances
5. **CDN**: Vercel handles this automatically

---

## Monitoring & Logging

### Vercel Logs
- Dashboard → Project → Deployments → Logs
- Real-time frontend errors
- Build logs

### Render Logs
- Dashboard → Service → Logs
- Real-time backend errors
- Server startup logs

### MongoDB Atlas
- Dashboard → Activity
- Query performance
- Storage usage

---

## Deployment Timeline

```
Week 1: Setup & Local Testing
├── Install MongoDB, Compass
├── Configure local .env files
├── Seed admin & therapist users
└── Test all features locally ✓

Week 2: Cloud Database Setup
├── Create MongoDB Atlas account
├── Set up cluster & database
├── Update connection strings
└── Test cloud connection ✓

Week 3: Frontend Deployment
├── Create Vercel account
├── Deploy to Vercel
├── Configure environment variables
└── Test Vercel deployment ✓

Week 4: Backend Deployment
├── Create Render account
├── Deploy to Render
├── Configure environment variables
├── Test API endpoints
└── Connect frontend & backend ✓

Week 5: Testing & Launch
├── End-to-end testing
├── Security review
├── Performance testing
└── Go live! 🚀
```

---

## Support & Resources

| Topic | Link |
|-------|------|
| **Vercel Docs** | https://vercel.com/docs |
| **Render Docs** | https://render.com/docs |
| **MongoDB Atlas** | https://www.mongodb.com/docs/atlas |
| **Express.js** | https://expressjs.com |
| **React** | https://react.dev |
| **Socket.io** | https://socket.io/docs |

---

## Troubleshooting Flowchart

```
❌ Something's not working?
├─ Check Frontend (Vercel)
│  ├─ F12 → Console for errors
│  ├─ Network tab for API calls
│  └─ Check environment variables
├─ Check Backend (Render)
│  ├─ View logs in Render dashboard
│  ├─ Test API with curl
│  └─ Check environment variables
├─ Check Database (MongoDB Atlas)
│  ├─ Verify connection string
│  ├─ Check IP whitelist
│  └─ View activity logs
└─ Check Integration
   ├─ Verify CORS settings
   ├─ Test Socket.io connection
   └─ Check JWT tokens
```

---

**Last Updated:** November 2025
**Version:** 1.0
**Status:** Production Ready
