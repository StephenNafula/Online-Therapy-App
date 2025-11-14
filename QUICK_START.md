# 🚀 Quick Start Guide - Deployment in 5 Steps

## Step 1: MongoDB Atlas Setup (5 minutes)

```
1. Go to: https://www.mongodb.com/cloud/atlas
2. Sign up with email or Google/GitHub
3. Create a Project (free tier)
4. Create a Cluster:
   - Select "M0 Free" tier
   - Choose region closest to you
   - Create cluster (takes ~3 minutes)
5. Get Connection String:
   - Click "Connect"
   - Choose "Drivers"
   - Copy connection string
   - Replace <password> with your DB password
6. Save this URL - you'll need it for Step 4
```

**Your URL will look like:**
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/happiness-therapy-app?retryWrites=true&w=majority
```

---

## Step 2: Vercel Frontend Deployment (5 minutes)

```
1. Go to: https://vercel.com
2. Sign up with GitHub (recommended)
3. Click "New Project"
4. Select your "Online-Therapy-App" repository
5. Configure:
   - Framework: Vite
   - Root Directory: ./client
   - Build Command: npm run build
   - Output Directory: dist
6. Add Environment Variables:
   Name: VITE_API_URL
   Value: https://your-backend-url.onrender.com/api
   
   Name: VITE_SOCKET_URL
   Value: https://your-backend-url.onrender.com
7. Deploy
8. Get your frontend URL: https://xxx.vercel.app
```

**Save this URL - you'll need it for Step 3 & 4**

---

## Step 3: Render Backend Deployment (10 minutes)

```
1. Go to: https://render.com
2. Sign up with GitHub
3. Click "New +"
4. Select "Web Service"
5. Select "Online-Therapy-App" repository
6. Configure:
   - Name: happiness-therapy-api
   - Environment: Node
   - Build Command: cd server && npm install
   - Start Command: cd server && npm start
   - Root Directory: / (leave blank)
7. Add Environment Variables:
   MONGODB_URI = mongodb+srv://... (from Step 1)
   JWT_SECRET = openssl rand -base64 32 (generate new one)
   PORT = 4000
   NODE_ENV = production
   CORS_ORIGIN = https://your-frontend.vercel.app (from Step 2)
8. Deploy
9. Wait for "listening on port 4000" message
10. Get your backend URL: https://xxx.onrender.com
```

**Save this URL for next step**

---

## Step 4: Connect Everything (5 minutes)

```
1. Update Vercel with Render URL:
   - Go to Vercel Dashboard
   - Your project → Settings → Environment Variables
   - Update VITE_API_URL = https://your-render-backend.onrender.com/api
   - Update VITE_SOCKET_URL = https://your-render-backend.onrender.com
   - Click "Deployments" → "Redeploy" on latest
   - Wait 2-3 minutes for redeploy

2. Update Render with Vercel URL:
   - Go to Render Dashboard
   - Your service → Environment
   - Update CORS_ORIGIN = https://your-vercel-frontend.vercel.app
   - Auto-redeploys automatically

3. Wait for both to finish deploying
```

---

## Step 5: Seed Admin & Therapist Users (2 minutes)

You have two options:

### Option A: Via Render Dashboard (Recommended)
```
1. Go to Render Dashboard
2. Your service → Shell
3. Run: cd server && node scripts/create_admin.js
4. Run: cd server && node scripts/create_therapist.js
5. You should see: "✓ User created successfully"
```

### Option B: Local (If you have server running)
```bash
cd server
npm install
node scripts/create_admin.js
node scripts/create_therapist.js
```

---

## 🎉 You're Done! Test It

### Test Frontend
Visit: `https://your-frontend.vercel.app`

Check:
- [ ] Home page loads
- [ ] Navigation works
- [ ] No console errors (F12)

### Test Login
Use these credentials:

**Admin:**
```
Email: mwaniki@example.com
Password: password123
```

**Therapist:**
```
Email: hapiness@example.com
Password: password123
```

### Test Guest Booking
- Click "Book Now (No Login)"
- Select a service
- Complete booking without login

---

## 📊 Your Deployment URLs

```
Frontend:  https://your-frontend.vercel.app
Backend:   https://your-backend.onrender.com
Database:  MongoDB Atlas (Cloud)
```

---

## ⚠️ Important Security Steps

### Change Default Passwords
```bash
# Render Shell:
cd server
node -e "
const User = require('./models/User');
User.updateOne(
  {email: 'mwaniki@example.com'}, 
  {password: 'new-secure-password'}
);
"
```

### Generate New JWT Secret
```bash
openssl rand -base64 32
```
Update in Render environment variables.

### MongoDB IP Whitelist
1. MongoDB Atlas Dashboard
2. Network Access
3. Add IP: Your Render static IP (or 0.0.0.0/0 for testing)

---

## 🔍 Troubleshooting

### Frontend shows blank page
```
1. Check Vercel build logs
2. Verify environment variables are set
3. Check browser console (F12)
```

### Cannot login / API errors
```
1. Check Render logs
2. Verify MongoDB connection string
3. Ensure CORS_ORIGIN is correct
4. Test: curl https://your-backend.onrender.com/api/bookings
```

### Cannot connect to database
```
1. Verify MongoDB connection string
2. Check IP whitelist in MongoDB Atlas
3. Ensure database user password is correct
```

### Socket.io not connecting
```
1. Verify VITE_SOCKET_URL matches backend URL
2. Check browser console for WebSocket errors
3. Ensure backend is running
```

---

## 📚 Full Documentation

For detailed information, see:
- **DEPLOYMENT_GUIDE.md** - Complete step-by-step guide
- **DEPLOYMENT_CHECKLIST.md** - Full checklist with testing
- **ARCHITECTURE.md** - System design & data flow

---

## ⏱️ Estimated Time
- MongoDB Atlas: 5 min
- Vercel: 5 min
- Render: 10 min
- Connecting: 5 min
- Seeding: 2 min

**Total: ~27 minutes**

---

## 🆘 Need Help?

| Issue | Solution |
|-------|----------|
| MongoDB connection fails | Check connection string & IP whitelist |
| Vercel deploy fails | Check build logs, verify env vars |
| Render deploy fails | Check port isn't 80, verify Node version |
| CORS errors | Ensure CORS_ORIGIN matches Vercel URL |
| Socket.io not working | Verify socket URL in .env matches backend |

---

## Next Steps After Deployment

1. ✅ Change default credentials
2. ✅ Update JWT_SECRET with secure value
3. ✅ Enable two-factor auth on MongoDB Atlas
4. ✅ Set up monitoring/alerts
5. ✅ Review security settings
6. ✅ Test all user flows end-to-end
7. ✅ Share with users!

---

**You're now ready to deploy! 🚀**

Questions? Check the full deployment guide or visit:
- Vercel Support: vercel.com/support
- Render Support: render.com/support
- MongoDB Support: mongodb.com/support
