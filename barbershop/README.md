# Gilded Razor & Co. - Barber Shop Website

Folders: `site/` = frontend (HTML/CSS/JS), `server/` = Node + Express booking API with a SQLite database (better-sqlite3).

## Run locally
1. `cd server && npm install && npm start`  (API on http://localhost:3000)
2. Open `site/index.html` with VS Code Live Server (or `npx serve site`).

## Deploy
**Backend (Render):** push to GitHub -> New Web Service -> Root Directory `server` -> Build `npm install` -> Start `npm start`.
Add env vars: `FRONTEND_URL` = your pages.dev URL (no trailing slash), `SHOP_TZ` = e.g. `Asia/Manila`.
**Frontend (Cloudflare Pages):** connect the repo -> Build command: none -> Output directory: `site`.
Then set `API_URL` in `site/js/config.js` to your Render URL and push again.

## Before you submit
- Add photos: `site/images/hero.jpg` (wide, ~1920px) and `site/images/shop.jpg` (~1000px).
- Open the Render URL once so it wakes up (free tier sleeps), then test the full journey.
- SQLite lives in `server/bookings.db`. On Render's FREE tier the disk is wiped on each redeploy/restart, so old bookings vanish. Fine for a demo. To keep data, add a Render persistent disk (paid), mount it at `/var/data`, and set env var `DB_PATH=/var/data/bookings.db`.
