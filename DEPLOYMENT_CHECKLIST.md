# Deployment Quick Start Checklist

## ✅ Phase 1: Local Setup (Today)

- [ ] **MongoDB**
  - [ ] Install MongoDB Community Edition
  - [ ] Start MongoDB service
  - [ ] Open MongoDB Compass
  - [ ] Create database: `happiness-therapy-app`
  - [ ] Create collections: `users`, `bookings`

- [ ] **Environment Setup**
  - [ ] Create `server/.env` with MongoDB URI
  - [ ] Create `client/.env.local` with API URLs
  - [ ] Seed admin and therapist users

- [ ] **Local Testing**
  - [ ] Run `npm start` in server folder
  - [ ] Run `npm run dev` in client folder
  - [ ] Test login, booking, and notifications

## ✅ Phase 2: MongoDB Atlas Setup (Cloud Database)

- [ ] Create MongoDB Atlas account (free tier)
- [ ] Create a cluster
- [ ] Get connection string
- [ ] Add IP whitelist
- [ ] Create database user
- [ ] Update `server/.env` with connection string
- [ ] Test connection

## ✅ Phase 3: Vercel Deployment (Frontend)

- [ ] Create Vercel account (sign up with GitHub)
- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Create `client/.env.production` with backend URL
- [ ] Deploy: `cd client && vercel --prod`
- [ ] Set environment variables in Vercel dashboard
- [ ] Verify frontend loads at Vercel URL
- [ ] Test navigation and pages load correctly

## ✅ Phase 4: Render Deployment (Backend)

- [ ] Create Render account (sign up with GitHub)
- [ ] Create Web Service connected to your GitHub repo
- [ ] Configure build & start commands
- [ ] Add environment variables (MongoDB Atlas URI, JWT_SECRET, CORS_ORIGIN)
- [ ] Deploy and wait for "listening on port 4000"
- [ ] Get Render URL
- [ ] Test API: `curl https://your-render-url.onrender.com/api/bookings`

## ✅ Phase 5: Connect Everything

- [ ] Update Vercel environment with final Render URL
- [ ] Redeploy Vercel
- [ ] Update Render CORS_ORIGIN to final Vercel URL
- [ ] Test login from Vercel → connects to Render
- [ ] Test data persists in MongoDB Atlas

## ✅ Phase 6: Security & Cleanup

- [ ] Change JWT_SECRET from default
- [ ] Update database password in MongoDB Atlas
- [ ] Enable firewall rules in MongoDB Atlas
- [ ] Add domains to Vercel deployment settings
- [ ] Test all workflows end-to-end

## 📱 Test Flows

### As Guest (No Login)
- [ ] Visit home page
- [ ] Click "Book Now (No Login)"
- [ ] Browse services
- [ ] Book a session (guest booking)
- [ ] Verify email
- [ ] See confirmation

### As Admin
- [ ] Login with admin credentials
- [ ] Access Dashboard
- [ ] See all bookings
- [ ] Verify payments
- [ ] Add notes to bookings
- [ ] See summary statistics

### As Therapist
- [ ] Login with therapist credentials
- [ ] Access Dashboard
- [ ] See assigned sessions
- [ ] Accept bookings
- [ ] Manage availability slots
- [ ] Verify payments
- [ ] Add session notes
- [ ] Receive real-time notifications

## 🔗 Final URLs

Once deployed, you'll have:

```
🎨 Frontend: https://happiness-therapy-app-frontend.vercel.app
🔌 Backend:  https://happiness-therapy-api.onrender.com
📊 Database: MongoDB Atlas (Cloud)
```

## 📞 Credentials to Update

**Default (CHANGE IN PRODUCTION):**
```
Admin Email: mwaniki@example.com
Admin Password: password123

Therapist Email: hapiness@example.com
Therapist Password: password123
```

Generate new secrets:
```bash
openssl rand -base64 32  # For JWT_SECRET
```

## 🆘 If Something Goes Wrong

1. **Check Logs**
   - Vercel: Dashboard → Deployments → Logs
   - Render: Dashboard → Your Service → Logs

2. **Check Environment Variables**
   - Frontend needs: VITE_API_URL, VITE_SOCKET_URL
   - Backend needs: MONGODB_URI, JWT_SECRET, CORS_ORIGIN

3. **Check Connection**
   - Frontend to Backend: DevTools Network tab
   - Backend to Database: Test connection string

4. **Test Locally First**
   - Ensure everything works on localhost:3000 & 4000
   - Then deploy incrementally

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Guide](https://www.mongodb.com/docs/atlas)
- [Full Deployment Guide](./DEPLOYMENT_GUIDE.md)

---

**Estimated Time:**
- MongoDB Setup: 10 minutes
- Vercel Deployment: 10 minutes
- Render Deployment: 15 minutes
- Testing & Verification: 15 minutes

**Total: ~50 minutes**
