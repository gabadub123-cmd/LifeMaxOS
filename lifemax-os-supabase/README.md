# LifeMax OS — Adrian's Living Dashboard (Supabase edition)

Cloud-synced personal planning system. Edit on your phone in the morning, the wall tablet in the kitchen sees it instantly. Deploy in ~20 minutes.

---

## What you're building

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  PHONE      │     │  WALL SCREEN│     │  LAPTOP     │
│  (add event)│ ──► │  (shows it) │ ◄── │  (edits)    │
└──────┬──────┘     └──────▲──────┘     └──────┬──────┘
       │                   │                    │
       └───────────────────┼────────────────────┘
                           ▼
                    ┌──────────────┐
                    │   SUPABASE   │
                    │  (your data) │
                    └──────────────┘
```

All devices stay in sync in real-time via Supabase's realtime subscriptions. Free tier covers you forever at personal usage.

---

## SETUP — 4 steps, ~20 minutes

### STEP 1 — Create Supabase project (3 min)

1. Go to https://supabase.com → Sign in with GitHub (free)
2. Click "New Project"
3. Fill in:
   - **Name:** lifemax-os
   - **Database password:** generate a strong one, save to password manager
   - **Region:** Frankfurt (eu-central-1) — closest to Belgium
   - **Plan:** Free
4. Wait ~2 min for it to provision

### STEP 2 — Run the SQL (1 min)

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **"New query"**
3. Open `supabase-setup.sql` from this folder, copy the entire contents
4. Paste into the Supabase SQL editor
5. Click **RUN** (or Ctrl/Cmd + Enter)
6. You should see "Success. No rows returned."

This creates the `lifemax_data` table and turns on real-time sync.

### STEP 3 — Get your Supabase credentials (1 min)

1. In Supabase, click **Settings** (gear icon, bottom left)
2. Click **API**
3. Copy two values:
   - **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
   - **anon / public key** (the long `eyJ...` string — NOT the service_role key)

### STEP 4 — Deploy to Netlify (10 min)

**Option A: GitHub + Netlify (recommended, auto-deploys)**

```bash
cd lifemax-os
git init
git add .
git commit -m "initial"
git branch -M main
# Create a new repo on github.com first, then:
git remote add origin https://github.com/YOURUSER/lifemax-os.git
git push -u origin main
```

Then on Netlify:
1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"** → pick GitHub → select your repo
3. Netlify auto-detects the `netlify.toml` settings. Click **"Deploy site"**.
4. First build will **fail** — that's expected, it needs env vars. Continue to the next step.
5. In your new Netlify site: **Site settings** → **Environment variables** → **Add a variable**
6. Add these three:
   ```
   VITE_SUPABASE_URL   = https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY   = eyJhbGc...YOUR_ANON_KEY
   VITE_USER_ID   = adrian
   ```
7. Go to **Deploys** tab → **Trigger deploy** → **Deploy site**
8. Wait ~2 min for the build. Your dashboard is live.
9. Rename your site in **Site settings** → **Change site name** → pick something like `adrian-lifemax` → URL becomes `adrian-lifemax.netlify.app`

**Option B: Drag and drop (faster but no auto-deploy)**

If you prefer no GitHub:
```bash
cd lifemax-os
npm install

# Create .env.local with your real values
cat > .env.local << EOF
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...YOUR_ANON_KEY
VITE_USER_ID=adrian
EOF

npm run build
```

Then drag the entire `dist/` folder onto https://app.netlify.com/drop.

Note: With this method, to update the app later you'll need to rebuild and re-drag. GitHub option is worth the 5 extra minutes.

---

## DONE — try the sync

1. Open your Netlify URL on your laptop → add an event in Plan tab
2. Open the same URL on your phone — event should appear within 1-2 seconds
3. The green dot next to "LIFEMAX OS" in the header = synced. Yellow = saving. Red = offline.

---

## Put it on a wall screen

### Cheapest path (€0)
Any old tablet or phone + browser in fullscreen mode. On iOS/iPadOS: Safari → Share → Add to Home Screen. On Android: Chrome → Menu → Add to Home Screen. Launches full-screen without browser UI.

### Better (€80-150)
- Budget Android tablet (Lenovo Tab M10, Redmi Pad, Fire HD 10)
- Install **Fully Kiosk Browser** (free) → point at your Netlify URL
- Wall mount or tablet stand
- Configure to stay awake when plugged in

### Enthusiast (Raspberry Pi)
- Pi 4 + any HDMI monitor
- Auto-launch Chromium in kiosk mode on boot
- Add to `/etc/xdg/lxsession/LXDE-pi/autostart`:
  ```
  @xset s off
  @xset -dpms
  @xset s noblank
  @chromium-browser --kiosk --noerrdialogs --disable-infobars https://adrian-lifemax.netlify.app
  ```

---

## Daily use

- **Morning:** Set your 3 targets in the Today tab
- **Throughout day:** Check off habits as you do them
- **Anywhere:** Add events in Plan tab from phone/laptop — wall screen updates
- **Night:** Fill in 3 wins + 1 lesson before bed
- **Sunday:** Reset weekly targets, review metrics, plan the week ahead

---

## Architecture notes

- **Frontend:** Vite + React, ~200KB gzipped
- **Storage:** All data in a single `lifemax_data` table, keyed by `(user_id, key)`
- **Sync:** Supabase Postgres changefeed → websocket → instant updates on all open clients
- **Debouncing:** Rapid edits (typing journal entries) debounce to 400ms so you're not spamming the DB
- **Echo prevention:** We track which keys this client just wrote, so realtime events from our own writes don't cause re-render loops

---

## Security model

This is **single-user, no-login** mode. Pros:
- No login screen — just visit the URL and use it
- Fastest UX for a personal dashboard

Cons:
- Anyone who knows your Netlify URL and your Supabase URL/anon key can read/write your data
- In practice: they'd need to find `adrian-lifemax.netlify.app`, inspect the JS bundle to extract the Supabase credentials, and then use them
- For a personal dashboard containing your training schedule and business metrics, this is acceptable
- DON'T put anything truly sensitive in here (passwords, SSNs, private customer data, etc.)

**If you want to add magic-link email login later**, it's a ~30 min upgrade:
1. In Supabase → Authentication → Providers → enable Email
2. Update the SQL policies to require `auth.uid() = user_id` instead of `using (true)`
3. Add a `Login.jsx` component with Supabase's `auth.signInWithOtp()`
4. Wrap the App in an auth guard

Ask me to build this when you're ready.

---

## Upgrade to Claude Code integration

The architecture is now Claude-Code-ready. To plug in:
1. Install Claude Code on your laptop
2. Teach it your Supabase credentials + table name in a `CLAUDE.md`
3. Give it a `@supabase/supabase-js` npm install in your project folder
4. Now you can say "Add client pitch Tuesday 2pm" and Claude Code writes directly to the same DB
5. The wall screen updates instantly because it's already subscribed to realtime

---

## Troubleshooting

**Setup screen appears after deploy:** Env vars aren't set or redeploy didn't pick them up. Trigger a manual redeploy in Netlify after setting vars.

**"SYNCING..." forever:** Supabase URL or anon key wrong. Check browser console (F12) for network errors.

**Changes don't sync across devices:** SQL didn't enable realtime publication. Re-run the SQL from `supabase-setup.sql`.

**"new row violates row-level security policy":** The policy didn't apply. Re-run the policy block from the SQL.

---

## Cost

- Supabase free tier: 500MB database, 2GB bandwidth/month, 50k monthly active users. Your dashboard will use ~0.01% of this.
- Netlify free tier: 100GB bandwidth/month, 300 build minutes. Your dashboard uses ~0.1%.
- Total monthly cost: **€0** indefinitely.
