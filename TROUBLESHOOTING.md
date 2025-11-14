# 🔧 Deployment Troubleshooting Guide

## Error: "Missing script: 'build'"

### Problem
```
npm error Missing script: "build"
npm error
npm error To see a list of scripts, run:
npm error   npm run
npm error A complete log of this run can be found in: /vercel/.npm/_logs/2025-11-14T12_06_26_780Z-debug-0.log
Error: Command "npm run build" exited with 1
```

### Cause
The Render deployment was trying to run `npm run build` but Node.js servers don't need a build step like frontend frameworks do.

### Solution

#### ✅ Already Fixed In Your Repository
The server `package.json` now includes a dummy build script:
```json
{
  "scripts": {
    "start": "node index.js",
    "build": "echo 'No build step needed for Node.js server'"
  }
}
```

#### What Changed
- Added `"build": "echo 'No build step needed for Node.js server'"` to server/package.json
- Updated Render build command to: `cd server && npm install && npm run build`

### Verification
After pushing the fix, redeploy on Render:

1. Go to Render Dashboard
2. Your service → Manual Deploy → Deploy latest commit
3. Check logs for:
   ```
   No build step needed for Node.js server
   npm install output...
   Server listening on port 4000
   ```

---

## Common Deployment Errors & Solutions

### 1. CORS Error: "Access to XMLHttpRequest blocked"

**Error in browser console:**
```
Access to XMLHttpRequest at 'https://xxx.onrender.com/api/...' 
from origin 'https://xxx.vercel.app' 
has been blocked by CORS policy
```

**Solution:**
1. Go to Render Dashboard → Your service
2. Environment Variables
3. Check `CORS_ORIGIN` matches your Vercel URL exactly
4. Update if needed:
   ```
   CORS_ORIGIN=https://xxx.vercel.app
   ```
5. Redeploy

### 2. "Cannot GET /api/bookings" (404 Error)

**Error:**
```
Cannot GET /api/bookings
```

**Solutions:**
- [ ] Check backend is actually running: `curl https://your-render-url.onrender.com`
- [ ] Verify Render logs show "listening on port 4000"
- [ ] Check VITE_API_URL in Vercel environment matches backend URL
- [ ] Ensure /api route exists in server/index.js

### 3. Socket.io Connection Failed

**Error in console:**
```
WebSocket connection to 'wss://xxx.onrender.com/socket.io/...' failed
```

**Solutions:**
- [ ] Verify VITE_SOCKET_URL is set correctly (should be same as VITE_API_URL without /api)
- [ ] Check backend is running with Socket.io enabled
- [ ] Try in incognito mode (clear browser cache)
- [ ] Check Render logs for Socket.io errors

### 4. MongoDB Connection Error

**Error:**
```
MongooseError: Cannot connect to MongoDB
```

**Solutions:**
- [ ] Verify MONGODB_URI in Render environment variables
- [ ] Check connection string format: `mongodb+srv://user:password@cluster.mongodb.net/dbname`
- [ ] Verify password doesn't have special characters (URL encode if needed)
- [ ] Check MongoDB Atlas IP whitelist includes Render's IP
- [ ] Ensure database user exists and has proper permissions

### 5. "Auth token missing" or "Unauthorized"

**Error:**
```
Error: Auth token missing
401 Unauthorized
```

**Solutions:**
- [ ] Login first before accessing protected routes
- [ ] Check JWT_SECRET matches between local and Render
- [ ] Verify token is being sent in Authorization header
- [ ] Try logging in again

### 6. Vercel Deployment Fails

**Error:**
```
Build failed with "Build Script Exited with code 1"
```

**Solutions:**
- [ ] Check Vercel build logs (Dashboard → Deployments → Failed → View Logs)
- [ ] Verify `npm run build` works locally: `cd client && npm run build`
- [ ] Check all environment variables are set in Vercel
- [ ] Ensure Node version is compatible (18+ recommended)
- [ ] Check for TypeScript errors: `npx tsc --noEmit`

### 7. Render Deployment Fails

**Error:**
```
Build failed with exit code 1
```

**Solutions:**
- [ ] Check Render logs (Dashboard → Service → Logs)
- [ ] Run build locally: `cd server && npm install && npm run build && npm start`
- [ ] Verify all dependencies are in package.json
- [ ] Check for syntax errors: `node -c server/index.js`
- [ ] Ensure Node version is 18+

### 8. "Module not found" Error

**Error:**
```
Error: Cannot find module 'express'
ModuleNotFoundError: No module named 'bcrypt'
```

**Solutions:**
- [ ] Reinstall dependencies: `npm install` (from root of that folder)
- [ ] Check package.json has all required dependencies
- [ ] Verify .gitignore doesn't exclude node_modules accidentally
- [ ] On Render, dependencies are installed during build automatically

### 9. "Cannot find database file" (MongoDB Compass)

**Error when running locally:**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions:**
1. Start MongoDB:
   ```bash
   # Linux
   sudo systemctl start mongod
   
   # macOS
   brew services start mongodb-community
   
   # Windows: Should auto-start
   ```
2. Verify it's running:
   ```bash
   mongosh
   ```
3. Update MONGODB_URI in .env:
   ```
   MONGODB_URI=mongodb://localhost:27017/happiness-therapy-app
   ```

### 10. "Port 4000 is already in use"

**Error:**
```
Error: listen EADDRINUSE :::4000
```

**Solutions:**
```bash
# Find process using port 4000
lsof -i :4000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=5000 npm start
```

---

## Step-by-Step Debugging Guide

### When Something Doesn't Work

#### Step 1: Check the Logs
```
Vercel:  Dashboard → Deployments → Click failed → View Logs
Render:  Dashboard → Service → Logs (tab)
MongoDB: Atlas → Activity
```

#### Step 2: Test Locally First
```bash
# Terminal 1
cd server
MONGODB_URI=mongodb://localhost:27017/happiness-therapy-app npm start

# Terminal 2
cd client
VITE_API_URL=http://localhost:4000/api npm run dev

# Then test in browser
```

#### Step 3: Test Each Component
```bash
# Test MongoDB connection
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/dbname"

# Test backend API
curl -X GET http://localhost:4000/api/bookings

# Test frontend build
cd client && npm run build

# Test frontend locally
cd client && npm run preview
```

#### Step 4: Check Environment Variables
```
Frontend (Vercel):
- [ ] VITE_API_URL is set
- [ ] VITE_SOCKET_URL is set
- [ ] Both point to correct backend URL

Backend (Render):
- [ ] MONGODB_URI is set
- [ ] JWT_SECRET is set
- [ ] PORT is 4000
- [ ] NODE_ENV is production
- [ ] CORS_ORIGIN matches frontend URL
```

#### Step 5: Review Git Commits
```bash
# See what changed
git log --oneline -5

# See which files changed
git diff HEAD~1 HEAD --name-only

# Verify package.json was updated
git show HEAD:server/package.json | grep build
```

---

## Pre-Deployment Checklist (Avoid Errors)

Before deploying to Vercel/Render:

### Frontend
- [ ] Run `npm run build` locally and it succeeds
- [ ] Run `npm run preview` locally and page loads
- [ ] Test navigation works
- [ ] DevTools Console shows no errors
- [ ] Environment variables are in `.env.production`

### Backend
- [ ] Run `npm install` and no warnings
- [ ] Run `npm start` and shows "listening on port 4000"
- [ ] Can create a user: `node scripts/create_admin.js`
- [ ] Can access API: `curl http://localhost:4000/api/bookings`
- [ ] No console errors on startup

### Database
- [ ] MongoDB is running locally
- [ ] Can connect with MongoDB Compass
- [ ] Database has collections: `users`, `bookings`
- [ ] Test user exists after seeding

### Git
- [ ] All changes committed: `git status` shows clean
- [ ] Latest code pushed: `git log origin/master`
- [ ] `.env` files are NOT committed
- [ ] `.gitignore` includes `.env`, `node_modules`, `dist`

---

## Emergency Recovery Steps

### If Frontend Broke

```bash
# Reset to last working commit
git checkout HEAD~1 -- client/

# Or restore from backup
git reflog
git checkout <commit-hash>

# Redeploy
cd client && vercel --prod
```

### If Backend Broke

```bash
# Check logs
curl https://your-render-url.onrender.com

# Restart service
# Render Dashboard → Service → More → Restart service

# Or redeploy
git push origin master
```

### If Database Lost Data

```bash
# Restore from backup (if available)
# MongoDB Atlas → Backup → Restore Snapshot

# Or reseed
cd server
node scripts/create_admin.js
node scripts/create_therapist.js
```

---

## Performance Optimization

### If Service is Slow

**Possible causes:**
1. Render is on free tier (slow)
   - Solution: Upgrade to Standard plan
2. MongoDB is on M0 tier
   - Solution: Upgrade to M2+ cluster
3. First request is slow (cold start)
   - Solution: Keep-alive or upgrade Render plan
4. Too many concurrent users
   - Solution: Add load balancing or upgrade

### If Database is Slow

```bash
# Check indexes
# MongoDB Atlas → Metrics → check for missing indexes

# Optimize queries
# Add indexes for commonly searched fields
# Use projections to return only needed fields
```

---

## Getting Help

### When You're Stuck

1. **Read the full error message** - scroll to bottom of logs
2. **Check official docs:**
   - Vercel: https://vercel.com/docs
   - Render: https://render.com/docs
   - MongoDB: https://mongodb.com/docs
3. **Search GitHub issues:**
   - Your repo: https://github.com/StephenNafula/Online-Therapy-App/issues
   - Express: https://github.com/expressjs/express/issues
   - Mongoose: https://github.com/Automattic/mongoose/issues
4. **Post on forums:**
   - Stack Overflow (tag your question correctly)
   - Reddit: r/learnprogramming, r/node
5. **Contact support:**
   - Vercel: vercel.com/support
   - Render: render.com/contact
   - MongoDB: mongodb.com/support

---

## Quick Fix Summary

| Error | Fix |
|-------|-----|
| Missing script 'build' | Update server package.json |
| CORS error | Update CORS_ORIGIN in Render |
| Cannot connect to DB | Check MongoDB URI and IP whitelist |
| API 404 | Verify backend is running |
| Socket.io fails | Check VITE_SOCKET_URL |
| Vercel blank page | Check build logs and env vars |
| Render won't start | Check logs for Node errors |
| Port in use | Kill process or use different port |
| MongoDB won't connect locally | Start mongod service |
| Auth errors | Regenerate JWT_SECRET and reseed |

---

**Last Updated:** November 14, 2025
**Status:** All known issues documented and fixed
