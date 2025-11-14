# Deployment Guide: MongoDB Compass, Vercel, and Render

This guide walks you through hosting the Happiness Online Therapy App across three platforms.

---

## 📋 Prerequisites

Before starting, ensure you have:
- [MongoDB Compass](https://www.mongodb.com/products/tools/compass) installed locally
- [Vercel CLI](https://vercel.com/docs/cli) installed: `npm i -g vercel`
- [Render](https://render.com) account (free tier available)
- GitHub repository set up (already done ✓)
- Git installed on your machine

---

## Part 1: MongoDB Atlas (Cloud Database) — Recommended

> Note: If you still want to run a local MongoDB for development, you can use MongoDB Compass or Community Edition. This section focuses on MongoDB Atlas (cloud) which is recommended for production and for Render to access.

### Step 1.1: Create a MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas and sign up (free M0 tier is fine).
2. Create a new project and then a free cluster (M0).

### Step 1.2: Create a Database User

1. In Atlas, go to **Database Access** → **Add New Database User**.
2. Create a user (example: `appuser`) and set a strong password.
3. Assign the `readWrite` role on the database or use the built-in roles.

### Step 1.3: Network Access (IP Whitelist)

1. Go to **Network Access** → **Add IP Address**.
2. For testing you can add `0.0.0.0/0` (allows all IPs) — **not recommended for production**; otherwise add your server IP or Render's IP ranges.

### Step 1.4: Get Your Connection String

1. In Atlas, go to **Clusters** → **Connect** → **Connect your application**.
2. Copy the connection string for Node.js and replace `<password>` with the password you created and set the default database name.

Example connection string (replace placeholders):
```env
MONGODB_URI=mongodb+srv://appuser:YourPassword@cluster0.abcd123.mongodb.net/happiness-therapy-app?retryWrites=true&w=majority
```

### Step 1.5: Update Server Configuration

Edit `server/.env` and add the Atlas URI and production secrets:

```env
# MongoDB (Atlas)
MONGODB_URI=mongodb+srv://appuser:YourPassword@cluster0.abcd123.mongodb.net/happiness-therapy-app?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-secret-key-here-change-this-in-production

# Server
PORT=4000
NODE_ENV=production

# Therapists and Clients
THERAPIST_EMAIL=hapiness@example.com
ADMIN_EMAIL=mwaniki@example.com
```

> Important: Do not commit `.env` to Git. Instead, add the same `MONGODB_URI` and `JWT_SECRET` to Render environment variables.

### Step 1.6: Seed Initial Data

You can seed the initial admin and therapist users once your server can connect to Atlas. Run these commands locally (with `server/.env` configured) or via a temporary Render shell:

```bash
cd server

# Seed admin user
node scripts/create_admin.js

# Seed therapist user
node scripts/create_therapist.js
```

**Expected Output:**
```
✓ Admin user created successfully
✓ Therapist user created successfully
```

### Optional: Use MongoDB Compass to View Atlas Data

If you prefer the Compass UI, you can connect Compass to your Atlas cluster:
1. Open MongoDB Compass
2. Use the Atlas connection string (choose "Connect with MongoDB Compass") and paste it into Compass
3. Connect and browse your databases and collections

---

## Part 2: Vercel (Frontend Deployment)

### Step 2.1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub (recommended for automatic deployments)
3. Authorize Vercel to access your GitHub account

### Step 2.2: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2.3: Configure Frontend Environment Variables

Create `client/.env.production` in your project:

```env
VITE_API_URL=https://your-backend-url.onrender.com/api
VITE_SOCKET_URL=https://your-backend-url.onrender.com
```

(We'll get the actual Render URL in Part 3)

For now, create `client/.env.local` for local testing:

```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

### Step 2.4: Deploy to Vercel via CLI

```bash
cd client

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

**During deployment, you'll be asked:**
- Project name: `happiness-therapy-app-frontend` (or similar)
      - Framework preset: Select `Vite` 
      - Build command: `npm run build`
      - Output directory: `dist` (if you're deploying from inside the `client` folder)
         OR set: `client/dist` when your project is a monorepo and Vercel runs the build from the repository root.
- Install dependencies: `Yes`

### Step 2.5: Configure Environment Variables in Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your project: `happiness-therapy-app-frontend`
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```
VITE_API_URL = https://your-backend-url.onrender.com/api
VITE_SOCKET_URL = https://your-backend-url.onrender.com
```

5. Deploy again after setting variables:
```bash
vercel --prod
```

### Step 2.6: Verify Frontend Deployment

Your site will be at a URL like: `https://happiness-therapy-app-frontend.vercel.app`

Visit it and check:
- [ ] Home page loads
- [ ] Navigation works
- [ ] No console errors (F12 to open DevTools)

---

## Part 3: Render (Backend Deployment)

### Step 3.1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 3.2: Create a Web Service

1. Click **"New +"** → **"Web Service"**
2. Select your repository: `Online-Therapy-App`
3. Configure:
   - **Name**: `happiness-therapy-api`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install && npm run build`
   - **Start Command**: `cd server && npm start`
   - **Root Directory**: `/` (leave blank)

### Step 3.3: Add Environment Variables

In Render dashboard, go to **Environment** section and add:

```
MONGODB_URI=mongodb://localhost:27017/happiness-therapy-app
JWT_SECRET=your-super-secret-key-change-this-in-production
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://happiness-therapy-app-frontend.vercel.app
```

⚠️ **IMPORTANT**: For production MongoDB, use MongoDB Atlas (cloud) instead of localhost:

### Step 3.4: Set Up MongoDB Atlas (Recommended for Production)

Since Render can't access your local MongoDB:

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a cluster (M0 free tier)
4. Get your connection string:
   - Go to **Connect** → **Drivers**
   - Copy the connection string
   - Replace `<password>` with your database password
   - Should look like: `mongodb+srv://user:password@cluster.mongodb.net/happiness-therapy-app?retryWrites=true&w=majority`

5. Update `server/.env`:
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/happiness-therapy-app?retryWrites=true&w=majority
JWT_SECRET=your-secret-key
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://happiness-therapy-app-frontend.vercel.app
```

6. In Render, update the `MONGODB_URI` environment variable with your Atlas connection string

### Step 3.5: Deploy to Render

1. In Render dashboard, click **"Deploy"**
2. Render will:
   - Clone your repo
   - Run `npm install` in server folder
   - Start the server with `npm start`
3. You'll get a URL like: `https://happiness-therapy-api.onrender.com`

### Step 3.6: Wait for Deployment

- Initial deployment takes 2-3 minutes
- Check the logs for any errors
- Look for: "listening on port 4000"

### Step 3.7: Test Backend

```bash
# Test the API
curl https://your-render-url.onrender.com/api/bookings

# You should get a JSON response (might be error if not authenticated, but that's OK)
```

---

## Part 4: Connect Everything

### Step 4.1: Update Frontend with Backend URL

1. Get your Render backend URL: `https://happiness-therapy-api.onrender.com`
2. Go to Vercel dashboard → Your project → Settings → Environment Variables
3. Update:
   ```
   VITE_API_URL=https://happiness-therapy-api.onrender.com/api
   VITE_SOCKET_URL=https://happiness-therapy-api.onrender.com
   ```
4. Redeploy: Click **"Deployments"** → **"Redeploy"** on latest

### Step 4.2: Update Backend CORS Settings

In `server/index.js`, update CORS:

```javascript
const cors = require('cors')

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
```

### Step 4.3: Verify Integration

1. Go to your Vercel frontend URL
2. Open DevTools (F12)
3. Try booking a session
4. Check Network tab - requests should go to Render backend
5. Check Console - no CORS errors

---

## Part 5: Testing Your Deployment

### Test Checklist

**Frontend (Vercel):**
- [ ] Home page loads
- [ ] Navigation works
- [ ] Can access Services page
- [ ] Can access About, Contact pages
- [ ] Staff Login button visible

**Backend (Render):**
- [ ] Health check: `curl https://your-render-url.onrender.com/api/bookings` (should return auth error or data)
- [ ] Can login as admin/therapist
- [ ] Can create bookings
- [ ] Real-time notifications work (Socket.io connection)

**Database (MongoDB):**
- [ ] Data persists after booking
- [ ] Users are stored correctly
- [ ] Can view data in Compass

### Login Credentials

**Admin:**
- Email: `mwaniki@example.com`
- Password: `password123` (change in production!)

**Therapist:**
- Email: `hapiness@example.com`
- Password: `password123` (change in production!)

---

## Part 6: Security & Production Best Practices

### 6.1: Update Secrets

**Change JWT_SECRET:**
```bash
# Generate a secure secret
openssl rand -base64 32
```

Update in:
- `server/.env`
- Render environment variables

### 6.2: Database Security

**MongoDB Atlas:**
1. Go to **Network Access**
2. Add IP whitelist (or allow 0.0.0.0/0 for testing)
3. Create database user with strong password
4. Enable two-factor authentication

### 6.3: API Keys & Environment Variables

Never commit:
- `.env` files
- API keys
- Secrets
- Database passwords

Check `.gitignore` includes these.

### 6.4: HTTPS & SSL

Both Vercel and Render provide free SSL certificates automatically.

---

## Part 7: Monitoring & Troubleshooting

### View Logs

**Vercel:**
- Dashboard → Your project → Deployments → Click deployment → Logs

**Render:**
- Dashboard → Your service → Logs

### Common Issues

**Issue: CORS Error**
```
Solution: Update CORS_ORIGIN in Render environment
```

**Issue: Cannot connect to database**
```
Solution: Check MongoDB connection string in .env
Verify IP whitelist if using Atlas
```

**Issue: Socket.io not connecting**
```
Solution: Ensure VITE_SOCKET_URL matches backend URL
Check that it's the same as VITE_API_URL without /api
```

**Issue: Vercel shows blank page**
```
Solution: Check Build Logs for errors
Verify environment variables are set
```

---

## Quick Reference Commands

```bash
# Local development
cd client && npm run dev    # Frontend (localhost:5173)
cd server && npm start      # Backend (localhost:4000)

# Deploy frontend
cd client && vercel --prod

# Deploy backend
cd server && git push       # Auto-deploys if Render is connected

# View logs
vercel logs https://your-frontend.vercel.app
```

---

## Summary

| Component | Platform | URL |
|-----------|----------|-----|
| **Database** | MongoDB Atlas | `mongodb+srv://...` |
| **Frontend** | Vercel | `https://happiness-therapy-app-frontend.vercel.app` |
| **Backend** | Render | `https://happiness-therapy-api.onrender.com` |

Once deployed, your app will be:
- ✅ Publicly accessible
- ✅ Using cloud database
- ✅ Real-time notifications working
- ✅ Therapist dashboards functional
- ✅ Guest booking available

---

## Support

For issues:
- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- MongoDB Atlas: https://www.mongodb.com/docs/atlas
