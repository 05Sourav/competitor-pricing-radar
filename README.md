# 📡 Competitor Pricing Radar

Get instant email alerts when competitors change their SaaS pricing pages.

Live at: **[pricingradar.xyz](https://pricingradar.xyz)**

---

## How It Works

1. **Submit** → User pastes a competitor pricing URL + their email
2. **Watch** → Worker runs daily, scrapes the page, saves a snapshot
3. **Diff** → Compares with the previous snapshot; strips noise (tracking scripts, footers, cookie banners, timestamps) before diffing
4. **AI Detect** → Gemini 2.5 Flash classifies the change into a structured type with confidence scoring
5. **Idempotency** → Exact change is hashed; duplicate alerts for the same change are suppressed
6. **Alert** → A richly formatted HTML + plain-text email is sent via Resend only when a real pricing change is confirmed

---

## Change Detection Types

The AI detector returns one of four structured change types:

| Type             | What It Means                                        |
| ---------------- | ---------------------------------------------------- |
| `price_change`   | A numeric price value changed (e.g. $29/mo → $39/mo) |
| `tier_change`    | A plan or tier was added, removed, or renamed        |
| `feature_change` | A feature in a plan's bullet list changed            |
| `copy_change`    | Non-structural marketing text changed                |

If confidence is below 0.6, the change is suppressed (prefers false negatives over false positives).

---

## Tech Stack

| Component      | Technology                       |
| -------------- | -------------------------------- |
| Frontend + API | Next.js 14 (App Router)          |
| Database       | Supabase (Postgres)              |
| Worker         | Node.js (Render Web Service)     |
| Scheduler      | node-cron (daily at 02:00 UTC)   |
| Scraping       | axios + cheerio                  |
| Diffing        | diff library (noise-stripped)    |
| AI             | Google Gemini 2.5 Flash          |
| Email          | Resend                           |
| Keepalive      | UptimeRobot → `/health` endpoint |

---

## Setup

### 1. Clone & install

```bash
git clone <your-repo>
cd competitor-pricing-radar
npm install
```

### 2. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase-schema.sql`
3. Run the migrations in order:
   - `migrations/add_last_checked_at.sql`
   - `migrations/add_change_tracking.sql`
4. Copy your project URL and keys

### 3. Gemini setup

1. Get a free API key at [aistudio.google.com](https://aistudio.google.com)
2. Set `GEMINI_API_KEY` in your environment

### 4. Resend setup

1. Sign up at [resend.com](https://resend.com)
2. Add and verify your domain
3. Create an API key
4. Set `RESEND_FROM_EMAIL` to `alerts@yourdomain.com`

### 5. Environment variables

```bash
cp .env.local.example .env.local
# Fill in all values
```

**.env.local.example:**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GEMINI_API_KEY=           # Get free key at aistudio.google.com

RESEND_API_KEY=
RESEND_FROM_EMAIL=alerts@yourdomain.com

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The worker also needs a `worker/.env` with the same Supabase, Gemini, and Resend keys, plus:

```
TRIGGER_SECRET=your_secret   # For the manual /trigger endpoint
PORT=3001
```

### 6. Run locally

```bash
# Frontend
npm run dev

# Worker (separate terminal)
cd worker
npm install
RUN_ON_START=true node index.js
```

---

## Deployment

### Frontend → Vercel

```bash
# Push to GitHub, then import in Vercel dashboard
# Add all env vars from .env.local.example in Vercel settings
```

### Worker → Render

1. Push to GitHub
2. New → **Web Service** on [render.com](https://render.com)
3. Root directory: `worker`
4. Build: `npm install`
5. Start: `npm start`
6. Add env vars in Render dashboard

The `render.yaml` handles this automatically with Render's Blueprint feature.

> **Keepalive:** The worker exposes a `/health` endpoint. Point [UptimeRobot](https://uptimerobot.com) at it with a 5-minute HTTP ping to prevent Render free-tier spin-down.

#### Manual Trigger

You can trigger a monitoring run on demand (without waiting for the cron):

```
GET https://your-worker-url.onrender.com/trigger?secret=YOUR_TRIGGER_SECRET
```

Returns `202 Accepted` immediately; the run executes in the background.

---

## Folder Structure

```
/app
  /api
    /submit      → POST: add a new monitor (with limit checks + confirmation email)
    /monitors    → GET: list monitors + alerts, DELETE: remove a monitor
  /dashboard     → Dashboard UI (email-based lookup)
  page.tsx       → Landing page + submission form
  layout.tsx
  globals.css

/components
  /animations
    FadeIn.tsx         → Fade-in animation wrapper
    Floating.tsx       → Floating animation wrapper
    RevealOnScroll.tsx → Scroll-triggered reveal animation

/lib
  supabase.ts          → Supabase client helpers (anon + service-role)
  email.ts             → Email helper (used for confirmation on signup)
  scraper.ts           → Shared scraper helper (TypeScript)
  /safety
    monitorLimits.ts   → Per-email limit (max 3) + global cap (max 500)
    apiResponse.ts     → Standardized API response helpers

/worker
  index.js       → Main cron worker + health check server + manual trigger
  scraper.js     → Fetches + cleans pricing page HTML
  diff.js        → Noise-stripped snapshot comparison + pricing hint extraction
  detector.js    → Gemini-powered structured change detection
  summarize.js   → Legacy AI helper (superseded by detector.js)
  package.json

/migrations
  add_last_checked_at.sql   → Adds 24-hour cooldown column
  add_change_tracking.sql   → Adds structured alert columns + idempotency hash

supabase-schema.sql   → Initial DB schema
render.yaml           → Render deployment config (Web Service)
.env.local.example    → Env vars template
```

---

## Safety & Rate Limiting

These protections are built into the API (`/api/submit`) and worker:

| Protection              | Limit                                | Where                       |
| ----------------------- | ------------------------------------ | --------------------------- |
| Per-email monitor limit | 3 monitors per email                 | API (`monitorLimits.ts`)    |
| Global monitor capacity | 500 total monitors                   | API (`monitorLimits.ts`)    |
| 24-hour check cooldown  | Skip if checked < 24h ago            | Worker (`index.js`)         |
| Change idempotency      | Hash-based duplicate suppression     | Worker (`index.js`)         |
| Safe API responses      | No internal errors exposed to client | `lib/safety/apiResponse.ts` |

---

## Database Schema

Three core tables + migrations:

**`monitors`** — tracks what to watch  
**`snapshots`** — stores daily page text content  
**`alerts`** — stores detected structured changes with `change_type`, `old_value`, `new_value`, `plan_name`, `confidence_score`

Run `supabase-schema.sql` first, then the two files in `migrations/` to get the current schema.

---

## Email Alerts

Alert emails include:

- **Change type badge** (color-coded: red = price, blue = tier, green = feature, grey = copy)
- **Structured details table**: Plan name, Before value, Now value, Detection timestamp
- **AI-generated summary** sentence
- **Source URL** link
- Plain-text fallback

Confirmation emails are sent when a new monitor is created.

---

## Cost Estimate (Free Tier)

| Service     | Free Tier                | Est. Usage                    |
| ----------- | ------------------------ | ----------------------------- |
| Supabase    | 500MB DB, 2GB bandwidth  | Plenty for indie              |
| Render      | Web Service (free tier)  | Free w/ UptimeRobot keepalive |
| Gemini      | Free tier via AI Studio  | ~$0                           |
| Resend      | 3,000 emails/month       | Free                          |
| Vercel      | Unlimited hobby projects | Free                          |
| UptimeRobot | 50 monitors free         | Free                          |

**Total monthly cost: ~$0** for early stage.

---

## Limitations & Next Steps

- **No auth** — dashboard is email-lookup only (add Supabase Auth later)
- **No Puppeteer** — JS-rendered pages may not scrape fully (add when needed)
- **No unsubscribe link** — users reply with "unsubscribe" to opt out (manual)
- **Single URL per monitor** — no multi-page or sitemap crawling yet

---

## License

MIT
