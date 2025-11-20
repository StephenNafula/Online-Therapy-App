# Login Credentials & Setup

## ✅ Login Fix Applied

**Issue**: Login was failing even with correct credentials because `client/src/pages/Login.jsx` was looking for `res.token` but the server was returning `res.accessToken`.

**Fix**: Updated `Login.jsx` to check for `res.accessToken` instead of `res.token`.

**Status**: ✅ Client rebuilt successfully with the fix.

---

## Default Seeded Users

These users are automatically created when the server starts (if they don't already exist):

### Admin Account
- **Email**: `mwaniki@example.com`
- **Password**: `Nyashinski@254` (or use `ADMIN_PW` environment variable)
- **Role**: Admin (can access `/app/admin` dashboard)

### Therapist Account
- **Email**: `hapiness@example.com`
- **Password**: `changeme` (or use `THERAPIST_PW` environment variable)
- **Role**: Therapist (can access `/app/dashboard`)

---

## How to Login

1. Go to **Staff Login** (top right of the home page) or navigate to `/login`
2. Enter email and password from above
3. Click **Login**
4. You'll be redirected to:
   - **Admin**: `/app/admin` (admin dashboard with analytics, therapist management, bookings overview, audit logs)
   - **Therapist**: `/app/dashboard` (therapist dashboard with availability, audio calls, session notes, messaging)

---

## How to Change Default Passwords

### Via Environment Variables (Recommended)

Set in your `.env` file:
```bash
ADMIN_PW=your_new_admin_password
THERAPIST_PW=your_new_therapist_password
```

Then restart the server. The next startup will use these passwords.

### Via Database (Manual)

1. Connect to MongoDB Atlas or local MongoDB
2. Find the `users` collection
3. Update the `passwordHash` for the user (requires bcrypt hash - not recommended)

---

## Troubleshooting Login Issues

### "Invalid credentials" error
- ✅ Double-check email and password spelling
- ✅ Check if server is running and MongoDB is connected
- ✅ Check browser console for detailed error messages

### "Login failed" error
- ✅ Verify `/auth/login` endpoint is registered in `server/index.js`
- ✅ Check server logs for errors
- ✅ Ensure `cookie-parser` is installed: `npm install cookie-parser`

### Token not stored
- ✅ Check browser DevTools → Application → Local Storage
- ✅ Verify token is being saved: `localStorage.getItem('token')`

### Cannot access dashboard after login
- ✅ Verify token exists in localStorage
- ✅ Check if role is correct (admin vs therapist)
- ✅ Look for 401 errors in network tab
- ✅ Try logging out and back in

---

## Testing the Login Flow

### Local Testing

1. **Start Server**:
   ```bash
   cd server && npm run dev
   ```
   Wait for: "Connected to MongoDB" and "Server listening on port 4000"

2. **Start Client** (in another terminal):
   ```bash
   cd client && npm run dev
   ```
   Client will be available at `http://localhost:5173`

3. **Test Login**:
   - Click "Staff Login" button
   - Enter credentials above
   - Should redirect to dashboard/admin

4. **Verify Token**:
   - Open DevTools (F12)
   - Go to Application → Local Storage
   - Should see `token` and `user` keys

---

## JWT Token Structure

The server issues tokens as follows:

```javascript
{
  accessToken: "eyJhbGc..." (expires in 15 minutes by default),
  user: {
    id: "user_id",
    name: "user_name",
    email: "user_email",
    role: "admin|therapist|client"
  }
}
```

The `accessToken` is automatically used in all API requests via the `Authorization: Bearer <token>` header (handled by the `post()` function in `client/src/api.js`).

---

## Refresh Token (httpOnly Cookie)

The server automatically creates a refresh token and stores it in an httpOnly cookie that:
- Cannot be accessed by JavaScript (XSS-safe)
- Is automatically sent with all requests
- Rotates on each `/api/auth/refresh` call
- Expires after 7 days by default

---

## Next Steps

- ✅ Login now works with correct credentials
- ⏭️ Access admin dashboard at `/app/admin` with admin account
- ⏭️ Access therapist dashboard at `/app/dashboard` with therapist account
- ⏭️ Configure environment variables for production (see `DEPLOYMENT_GUIDE.md`)
