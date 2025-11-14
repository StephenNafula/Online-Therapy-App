# Stitch Therapy (MERN) - Minimal Scaffold

This workspace contains a minimal MERN scaffold to run an online therapy app with audio-only sessions.

IMPORTANT: This is a starter implementation to be extended. It purposefully does NOT perform any recording or in-app payments. Payments must be handled by an external provider; the app stores/display-only payment references.

Folders
- `server/` - Express API, MongoDB models, Socket.IO signaling
- `client/` - Vite + React minimal front-end

Quick start (requires Node.js and MongoDB locally)

1. Server

```bash
# from stitch_home_page/server
cd "/home/steve/Downloads/Online Therapy app/stitch_home_page/server"
npm install
# copy .env.example to .env and edit MONGO_URI and JWT_SECRET
cp .env.example .env
# start server
npm run dev
```

2. Client

```bash
# from stitch_home_page/client
cd "/home/steve/Downloads/Online Therapy app/stitch_home_page/client"
npm install
npm run dev
```

By default the client expects the API at `http://localhost:4000/api`. You can change that by setting `VITE_API_URL` (Vite) before running the client. Example: `VITE_API_URL=http://localhost:4000/api npm run dev`.

Styling note: the development client currently loads Tailwind from the CDN (convenient for prototyping). The browser will show a console message like:

	"cdn.tailwindcss.com should not be used in production. To use Tailwind CSS in production, install it as a PostCSS plugin or use the Tailwind CLI: https://tailwindcss.com/docs/installation"

For production builds, install Tailwind properly (PostCSS plugin or Tailwind CLI) and build your CSS at bundle time. I can add a PostCSS/Tailwind setup to the `client/` project if you'd like — it's a small set of steps but requires rebuilding styles as part of the Vite build.

Security and privacy notes
- Auth: JWT-based authentication is implemented for basic protection. Use strong `JWT_SECRET` in production.
- HTTPS: Deploy behind TLS (production must use HTTPS). Avoid exposing MongoDB directly.
- No recording: The server and client do not store or transmit media to persistent storage. Signaling is relayed via Socket.IO only; media flows directly peer-to-peer via WebRTC where possible. The code explicitly does not include recording logic.
- Therapist controls: Therapists have role-based actions (end call, update booking status). Role enforcement is done on the server.
- Payments: The app only stores/display payment references. Do NOT process card details in the app. Integrate with external PCI-compliant providers.

How the audio meeting works (short)
- A booking contains a generated `roomId`.
- Client and therapist open `/meeting/:roomId` which connects to the server via Socket.IO.
- Peers exchange SDP/ICE via the server; media is audio-only (getUserMedia({audio:true})).
- Therapist can emit an `end-call` signal; clients leave the room and stop media.

Next steps / recommendations
- Add strong input validation and rate limiting.
- Add tests and CI.
- Add HTTPS and proper deployment configuration.
- Implement calendar availability, timezone handling and email confirmations.
- Add server-side logging and monitoring (don't log sensitive info).

If you want, I can now:
- Run `npm install` in `server/` and `client/` and start both dev servers to validate locally.
- Add more UI polish to match your existing static pages and copy over styles.

