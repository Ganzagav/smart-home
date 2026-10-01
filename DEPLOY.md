# Deploy: GitHub → Neon → Render → Vercel

| Part | Service | Name to use | Result |
|---|---|---|---|
| Code | GitHub | `smart-home-automation` | `https://github.com/<you>/smart-home-automation` |
| Database | Neon | project `smart-home-automation` | PostgreSQL in the cloud |
| Backend (Node + Prisma) | Render | web service `smart-home-api` | `https://smart-home-api.onrender.com` |
| Frontend (React) | Vercel | project `smart-home-automation` | `https://smart-home-automation.vercel.app` |

If a name is already taken, add something to it (for example `smart-home-api-yvette`) and use your real URL in the later steps.

---

## Step 1 — Push the code to GitHub

1. On GitHub, go to **New repository**.
   - Name: **`smart-home-automation`**
   - Public or Private (either works with Render and Vercel)
   - Do **not** tick “Add a README”, “.gitignore” or “license” (the project already has them)
   - Click **Create repository**
2. Open **PowerShell** or the VS Code terminal and run:

```powershell
cd C:\Users\USER\Desktop\webEspLightController

# only the first time you use git on this computer
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

git init
git add .
git status
```

3. Check the `git status` list. It must **not** contain `node_modules`, `backend/.env`, or `pnpm-lock.yaml` (the `.gitignore` file hides them). Then:

```powershell
git commit -m "Smart Home Automation: React + Node.js + Prisma + ESP32"
git branch -M main
git remote add origin https://github.com/<your-username>/smart-home-automation.git
git push -u origin main
```

Refresh the GitHub page. You should see `backend`, `frontend`, `esp32`, `README.md`, `DEPLOY.md`.

---

## Step 2 — Create the database on Neon

1. Go to neon.tech → sign in with GitHub → **New project**.
   - Project name: **`smart-home-automation`**
   - Postgres version: default
   - Region: **AWS Europe (Frankfurt)** (closest to Rwanda) — or the one closest to your Render region
2. On the project dashboard click **Connect**.
   - Turn **Connection pooling OFF** (Prisma migrations need the direct connection)
   - Copy the connection string. It looks like:
     `postgresql://neondb_owner:XXXX@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`

---

## Step 3 — Create the tables and the 3 LEDs in Neon (from your laptop)

1. Open `backend/.env` and replace the `DATABASE_URL` line with the Neon string (keep the old one as a comment):

```env
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/iot_led_db"
DATABASE_URL="postgresql://neondb_owner:XXXX@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"
```

2. Run:

```powershell
cd C:\Users\USER\Desktop\webEspLightController\backend
npx prisma migrate deploy
npm run db:seed
```

`migrate deploy` creates the tables from the files in `prisma/migrations`. `db:seed` adds the board `esp32-01` and the Red, Yellow and Green LEDs.
Check in the Neon dashboard → **Tables**: you should see `Device`, `Led`, `Command`, `StatusLog`.

(`.env` is not pushed to GitHub, so your password stays private.)

---

## Step 4 — Deploy the backend on Render

1. Go to render.com → sign in with GitHub → **New +** → **Web Service** → choose the repo **smart-home-automation**.
2. Fill in:

| Field | Value |
|---|---|
| Name | **`smart-home-api`** |
| Region | Frankfurt (EU Central) |
| Branch | `main` |
| Root Directory | **`backend`** |
| Runtime / Language | Node |
| Build Command | **`npm install && npm run build`** |
| Start Command | **`npm start`** |
| Instance Type | Free |

3. **Environment Variables** → add:

| Key | Value |
|---|---|
| `DATABASE_URL` | the Neon connection string from Step 2 |
| `DEVICE_API_KEY` | a new secret, e.g. `shome-2026-x7k9` (write it down — the ESP32 needs it) |

4. (Advanced) **Health Check Path**: `/api/health`
5. Click **Create Web Service** and wait until the log says `API running on ...` and the status is **Live**.
6. Test in your browser:
   `https://smart-home-api.onrender.com/api/devices/esp32-01`
   You should see JSON with 3 LEDs.

---

## Step 5 — Deploy the frontend on Vercel

1. Go to vercel.com → sign in with GitHub → **Add New…** → **Project** → **Import** `smart-home-automation`.
2. Fill in:

| Field | Value |
|---|---|
| Project Name | **`smart-home-automation`** |
| Framework Preset | Vite |
| Root Directory | **`frontend`** (click *Edit*) |
| Build Command | `npm run build` (default) |
| Output Directory | `dist` (default) |

3. **Environment Variables** → add:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://smart-home-api.onrender.com` (your Render URL, **no `/` at the end**) |

4. Click **Deploy**. When it finishes, open `https://smart-home-automation.vercel.app`.
   You should see the 3 LED cards. Click a button → the history shows **PENDING**.

---

## Step 6 — Point the ESP32 to the live backend

In `esp32/led_controller/led_controller.ino` change:

```cpp
const char* SERVER_URL = "https://smart-home-api.onrender.com";   // your Render URL, no "/" at the end
const char* DEVICE_KEY = "shome-2026-x7k9";                        // same as DEVICE_API_KEY on Render
```

Upload to the board and open the Serial Monitor (115200). Every 2 s you should see the poll; click a button on the Vercel page and the LED switches, the history shows **EXECUTED**.

The ESP32 can now be on **any** Wi-Fi with internet — it no longer needs to be on the same network as your laptop.

---

## Step 7 — Updating later

```powershell
cd C:\Users\USER\Desktop\webEspLightController
git add .
git commit -m "Describe your change"
git push
```

Render and Vercel redeploy automatically after every push.
If you change `schema.prisma`: run `npx prisma migrate dev --name <change>` locally first (against your local database), commit the new folder in `prisma/migrations`, then push — Render runs `prisma migrate deploy` during the build.

---

## Good to know

- **Render free plan sleeps** after about 15 minutes with no requests. The first request then takes up to about a minute. While the ESP32 is polling, the service stays awake.
- **Never push `.env`.** If a password was pushed by mistake, reset it in Neon and update Render.
- Use a **new `DEVICE_API_KEY`** for the live system — not the example one from the README.
- If the page shows “Cannot reach the API”: check `VITE_API_URL` on Vercel (then **Redeploy**), and open the Render URL once to wake it up.
- To go back to local development, switch `DATABASE_URL` in `backend/.env` back to the local line.
