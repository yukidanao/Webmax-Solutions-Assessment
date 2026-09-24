# Deploying Gilded Razor & Co.

This guide deploys:

- **Frontend** (static HTML/CSS/JS in `site/`) on **Cloudflare Pages** -> `https://<project>.pages.dev`
- **Backend** (Node + Express API in `server/`) on **Vercel** -> `https://<project>.vercel.app`

Everything is free-tier friendly. One small code change is required so the API can run as a Vercel serverless function — step 1.

---

## 0. Put the repo on GitHub

Both platforms can be connected to a Git repo (recommended: every push redeploys automatically). You can also skip Git and use the "Direct Upload" options, but Git is the smoother path.

```bash
cd "F:\Developed Apps\gilded-razor-barbershop"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<your-user>/<repo>.git
git push -u origin main
```

Create a `.gitignore` at the repo root first so junk isn't committed:

```gitignore
node_modules
bookings.db
```

---

## 1. Prepare the backend for Vercel (required)

Vercel runs your Express app as a **serverless function**, which means the app must be *exported* instead of just calling `app.listen()` at startup.

**Edit `server/server.js`** — replace the last line:

```js
app.listen(PORT, () => console.log('API running on port ' + PORT));
```

with:

```js
// Serve normally when run locally; export the app when hosted on Vercel.
if (require.main === module) {
  app.listen(PORT, () => console.log('API running on port ' + PORT));
}
module.exports = app;
```

Local dev still works: `cd server && npm install && npm start`.

**Create `server/vercel.json`:**

```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

This is what makes Vercel treat `server.js` as the API entry point. (Vercel may label these "legacy" project settings; they still work fine.)

**Note on Node version:** `better-sqlite3` is a native module. If the build ever fails on Vercel, set a matching Node version in Vercel's *Settings -> Functions -> Node.js Version* (e.g. `22.x`), or add to `server/package.json`:

```json
"engines": { "node": "22.x" }
```

---

## 2. Deploy the backend to Vercel

1. Go to https://vercel.com and click **Add New... -> Project**.
2. Import the GitHub repo you just pushed.
3. Configure:
   - **Root Directory:** `server`
   - **Framework Preset:** leave as *Other* (Vercel auto-runs `npm install`; there is no build script).
4. Add the environment variable (under **Settings -> Environment Variables**, or in the project config screen):
   - `FRONTEND_URL` = your pages.dev URL once you know it, e.g. `https://golden-razor.pages.dev` — **no trailing slash**. This sets the CORS `origin` in `server.js`. Until the frontend exists, `FRONTEND_URL` can be empty (the API then allows all origins).
   - Optional: `SHOP_TZ = Asia/Manila` (keeps the same default the code already uses).
5. Click **Deploy**. When it finishes you get `https://<project>.vercel.app`.

**Smoke-test the API** in a browser:

```
https://<project>.vercel.app/api/availability?date=2026-10-02&barber=marco&service=haircut
```

You should see JSON like `{"slots":["09:00","09:30",...]}`.

`FRONTEND_URL` is only used for CORS, so if the origin doesn't match your frontend exactly (`https://`, no trailing slash, custom domain included), the browser will block the requests — see Troubleshooting.

---

## 3. Deploy the frontend to Cloudflare Pages

1. Go to https://dash.cloudflare.com -> **Workers & Pages -> Create -> Pages -> Connect to Git**.
2. Import the same repo.
3. Configure:
   - **Build command:** *(leave empty)*
   - **Build output directory:** `site`
4. Click **Save and Deploy**. Cloudflare detects `index.html` in `site/` and serves it at `https://<project>.pages.dev`.

The first deploy works out of the box. After it exists, point it at your Vercel API.

**Point the frontend at your Vercel API.** Edit `site/js/config.js`:

```js
const API_URL = 'https://<project>.vercel.app';
```

…commit and push; Cloudflare auto-rebuilds.

**Alternative (no code edit) — build-time env var:**

1. Cloudflare Pages -> Project -> **Settings -> Environment variables** -> add `API_URL` = `https://<project>.vercel.app` for the *Production* environment.
2. Set the project **Build command** to:

```bash
sed -i "s#http://localhost:3000#${API_URL}#g" site/js/config.js
```

(The Cloudflare build image is Linux, so `sed` is available. Only text after `#` matters — `#` is a safe delimiter here.)

**Test the full journey:** open `https://<project>.pages.dev/booking.html`, pick a service, barber and date, and confirm times load.

**Optional — custom domain:** Pages -> project -> **Custom domains**. If you use one, remember `FRONTEND_URL` on Vercel and `API_URL` in the frontend must use that exact domain.

---

## 4. Data storage on Vercel (important!)

Vercel serverless functions run on AWS Lambda, where the filesystem is **read-only except `/tmp`**, and each instance is ephemeral and not shared. A local SQLite file like `server/bookings.db` **cannot persist** there the way it does on a normal server. Two realistic choices:

**Option A — accept it for a demo:**
Set env var `DB_PATH=/tmp/bookings.db` on Vercel. The API works, but the database resets whenever the function cold-starts and one request may not see a booking made seconds earlier by a different instance. Fine for a throwaway demo, not for real customers.

**Option B — use a hosted database (recommended for a live site):**
- **Turso** (libSQL, a SQLite fork) is the closest drop-in: your existing SQL schema stays, you just swap `better-sqlite3` for `@libsql/client` and adjust the ~15 lines of database code in `server.js`.
- **Vercel Postgres / Neon / Supabase** is a bigger change because the queries would need to be rewritten.

Happy to write the Turso migration and a Vercel `api/` function for you if you want to go production-grade.

---

## Appendix: what the pieces are

| Concern | Where |
| --- | --- |
| Static site (HTML/CSS/JS/images) | `site/` -> Cloudflare Pages |
| Booking API (Express) | `server/server.js` -> Vercel |
| Shop content, hours, prices | `site/js/config.js` (duplicated IDs in `server/server.js`) |
| CORS origin | Vercel env var `FRONTEND_URL` |
| API base URL the site calls | `API_URL` in `site/js/config.js` |

## Troubleshooting

- **Browser console shows a CORS error:** `FRONTEND_URL` on Vercel must match the frontend origin *exactly* — `https://yes-exactly-this.pages.dev`, no trailing slash, custom domain if you use one. Re-deploy after fixing.
- **Sites loads but "Could not load times":** `API_URL` in `site/js/config.js` is probably still `http://localhost:3000`. Set it to your Vercel URL.
- **Vercel returns 404 for `/api/...`:** confirm the project **Root Directory** is `server` and that `server/vercel.json` was pushed. Then test `https://<project>.vercel.app/` (should print "Gilded Razor API is running").
- **`better-sqlite3` fails to build on Vercel:** pin the Node runtime (see step 1).
- **Bookings appear/disappear randomly:** that's the Lambda filesystem behavior in section 4 — switch to a hosted database.