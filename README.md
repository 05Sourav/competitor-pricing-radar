# 📡 Competitor Pricing Radar

Get instant email alerts when competitors change their SaaS pricing pages.

---

## How It Works

1. **Submit** → User pastes a competitor pricing URL + their email
2. **Watch** → Worker runs daily, scrapes the page, saves a snapshot
3. **Diff** → Compares with previous snapshot to detect text changes
4. **AI Filter** → OpenRouter (free model) determines if it's a *meaningful* pricing change
5. **Alert** → Email sent via Resend only when something real changed

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend + API | Next.js 14 (App Router) |
| Database | Supabase (Postgres) |
| Worker | Node.js (Render) |
| Scheduler | node-cron |
| Scraping | axios + cheerio |
| Diffing | diff library |
| AI | OpenRouter (free models) |
| Email | Resend |

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
3. Copy your project URL and keys

### 3. OpenRouter setup

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Create an API key (free tier works — uses `meta-llama/llama-3.1-8b-instruct:free`)

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

### 6. Run locally

```bash
# Frontend
npm run dev

# Worker (in a separate terminal)
cd worker
npm install
RUN_ON_START=true node index.js
```

---

## Deployment

### Frontend → Vercel

```bash
# Push to GitHub, then import in Vercel
# Add all env vars in Vercel dashboard
```

### Worker → Render

1. Push to GitHub
2. New → Background Worker on [render.com](https://render.com)
3. Root directory: `worker`
4. Build: `npm install`
5. Start: `npm start`
6. Add env vars in Render dashboard

The `render.yaml` file handles this automatically if you use Render's Blueprint feature.

---

## Folder Structure

```
/app
  /api
    /submit      → POST: add a new monitor
    /monitors    → GET: list monitors + alerts, DELETE: remove monitor
  /dashboard     → Dashboard UI
  page.tsx       → Landing page + submission form
  layout.tsx

/lib
  supabase.ts    → DB client helpers
  email.ts       → Email send helper

/worker
  index.js       → Main cron worker (entry point)
  scraper.js     → Fetches + cleans pricing page HTML
  diff.js        → Compares old vs new snapshots
  summarize.js   → OpenRouter AI call for pricing change detection
  package.json

supabase-schema.sql   → DB setup SQL
render.yaml           → Render deployment config
.env.local.example    → Env vars template
```

---

## Changing the AI Model

Edit `worker/summarize.js` line with `model:`:

```js
// Free models on OpenRouter:
model: 'meta-llama/llama-3.1-8b-instruct:free'  // default
model: 'google/gemma-2-9b-it:free'
model: 'mistralai/mistral-7b-instruct:free'
```

---

## Cost Estimate (Free Tier)

| Service | Free Tier | Est. Usage |
|---------|-----------|-----------|
| Supabase | 500MB DB, 2GB bandwidth | Plenty for indie |
| Render | 750 hrs/month worker | Free |
| OpenRouter | Free models available | ~$0 |
| Resend | 3,000 emails/month | Free |
| Vercel | Unlimited hobby projects | Free |

**Total monthly cost: ~$0** for early stage.

---

## Limitations & Next Steps

- **No auth** — dashboard is email-lookup only (add Supabase Auth later)
- **No Puppeteer** — some JS-heavy pages won't scrape well (add later if needed)
- **Free AI models** — may be slower/less accurate than paid (upgrade when revenue justifies)
- **Rate limits** — free OpenRouter models have request limits

---

## License

MIT
