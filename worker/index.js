// worker/index.js
// Main background worker - runs daily via cron
// Responsibilities: fetch pages, compare snapshots, detect changes, send email alerts
// Health check server keeps Render free tier alive (ping via UptimeRobot every 5 min)

require("dotenv").config({ path: "../.env.local" });

const http = require("http");
const cron = require("node-cron");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");
const { scrapePage } = require("./scraper");
const { compareSnapshots, buildDiffContext } = require("./diff");
const { summarizeWithAI } = require("./summarize");

// ---- Clients ----
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const resend = new Resend(process.env.RESEND_API_KEY);

// ---- Core Monitoring Function ----
async function runMonitoring() {
  console.log(
    `[worker] Starting monitoring run at ${new Date().toISOString()}`,
  );

  // 1. Fetch all active monitors
  const { data: monitors, error } = await supabase
    .from("monitors")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("[worker] Failed to fetch monitors:", error.message);
    return;
  }

  console.log(`[worker] Processing ${monitors.length} monitor(s)`);

  for (const monitor of monitors) {
    try {
      await processMonitor(monitor);
    } catch (err) {
      console.error(
        `[worker] Error processing monitor ${monitor.id}:`,
        err.message,
      );
    }

    // Small delay between requests to be polite to servers
    await sleep(2000);
  }

  console.log("[worker] Monitoring run complete");
}

async function processMonitor(monitor) {
  // Feature 3 — 24-hour cooldown: skip monitor if checked within the last 24h
  if (monitor.last_checked_at) {
    const elapsed = Date.now() - new Date(monitor.last_checked_at).getTime();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    if (elapsed < TWENTY_FOUR_HOURS_MS) {
      console.log(
        `[worker] Skipping ${monitor.competitor_name} — checked ${Math.round(elapsed / 3600000)}h ago (< 24h cooldown)`,
      );
      return;
    }
  }

  console.log(`[worker] Checking: ${monitor.competitor_name} (${monitor.url})`);

  // 2. Scrape current page
  const newContent = await scrapePage(monitor.url);
  if (!newContent) {
    console.warn(`[worker] Could not scrape ${monitor.url} - skipping`);
    return;
  }

  // 3. Get previous snapshot
  const { data: prevSnapshots } = await supabase
    .from("snapshots")
    .select("*")
    .eq("monitor_id", monitor.id)
    .order("fetched_at", { ascending: false })
    .limit(1);

  const prevSnapshot = prevSnapshots?.[0];

  // 4. Save new snapshot
  const { data: newSnapshot, error: snapError } = await supabase
    .from("snapshots")
    .insert({ monitor_id: monitor.id, content: newContent })
    .select()
    .single();

  if (snapError) {
    console.error(
      `[worker] Failed to save snapshot for ${monitor.id}:`,
      snapError.message,
    );
    return;
  }

  // Feature 3 — Stamp last_checked_at after a successful scrape+save
  await supabase
    .from("monitors")
    .update({ last_checked_at: new Date().toISOString() })
    .eq("id", monitor.id);

  // 5. If no previous snapshot, this is the baseline - nothing to compare
  if (!prevSnapshot) {
    console.log(
      `[worker] First snapshot saved for ${monitor.competitor_name} - baseline set`,
    );
    return;
  }

  // 6. Quick diff check - skip AI if no text changes at all
  const { hasChanges } = compareSnapshots(prevSnapshot.content, newContent);
  if (!hasChanges) {
    console.log(`[worker] No changes detected for ${monitor.competitor_name}`);
    return;
  }

  // 7. Build diff context and call AI for meaningful change detection
  const diffContext = buildDiffContext(prevSnapshot.content, newContent);
  if (!diffContext) {
    console.log(`[worker] Diff context empty for ${monitor.competitor_name}`);
    return;
  }

  const summary = await summarizeWithAI(prevSnapshot.content, newContent);
  if (!summary) {
    console.log(
      `[worker] No meaningful pricing change for ${monitor.competitor_name}`,
    );
    return;
  }

  console.log(
    `[worker] PRICING CHANGE DETECTED for ${monitor.competitor_name}: ${summary}`,
  );

  // 8. Save alert to DB
  const { data: alert, error: alertError } = await supabase
    .from("alerts")
    .insert({
      monitor_id: monitor.id,
      summary,
      old_snapshot_id: prevSnapshot.id,
      new_snapshot_id: newSnapshot.id,
    })
    .select()
    .single();

  if (alertError) {
    console.error("[worker] Failed to save alert:", alertError.message);
    return;
  }

  // 9. Send email alert
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "alerts@pricingradar.xyz",
      to: monitor.user_email,
      reply_to: "contact@pricingradar.xyz",
      subject: `🚨 Pricing change detected: ${monitor.competitor_name}`,
      html: buildEmailHtml(monitor, summary),
    });

    // Mark alert as emailed
    await supabase.from("alerts").update({ emailed: true }).eq("id", alert.id);

    console.log(`[worker] Alert email sent to ${monitor.user_email}`);
  } catch (emailErr) {
    console.error("[worker] Email send failed:", emailErr.message);
  }
}

// ---- Email HTML ----
function buildEmailHtml(monitor, summary) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #ef4444; margin-bottom: 8px;">🚨 Pricing Change Detected</h2>
      <p style="color: #6b7280; margin-bottom: 24px;">
        Competitor Pricing Radar spotted a change on <strong>${monitor.competitor_name}</strong>
      </p>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 16px; color: #92400e;">${summary}</p>
      </div>

      <p style="margin-bottom: 4px; color: #374151;"><strong>Source URL:</strong></p>
      <a href="${monitor.url}" style="color: #3b82f6; word-break: break-all;">${monitor.url}</a>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #9ca3af; font-size: 12px;">
        Alerts are sent only when meaningful pricing changes are detected.<br/>
        Powered by Competitor Pricing Radar.
      </p>
    </div>
  `;
}

// ---- Helpers ----
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- Schedule ----
// Runs daily at 2:00 AM UTC
cron.schedule("0 2 * * *", () => {
  runMonitoring().catch(console.error);
});

// ---- Health Check Server ----
// Keeps Render free tier alive when pinged by UptimeRobot every 5 minutes.
// Render requires a bound port to classify this as a Web Service.
const PORT = process.env.PORT || 3001;

const healthServer = http.createServer((req, res) => {
  const method = req.method;
  const url = req.url;

  if ((method === "GET" || method === "HEAD") && url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    // HEAD requests must not include a body
    if (method === "GET") {
      res.end(
        JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
      );
    } else {
      res.end();
    }
  } else if ((method === "GET" || method === "HEAD") && url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    if (method === "GET") {
      res.end("Competitor Pricing Radar worker is running.");
    } else {
      res.end();
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(PORT, () => {
  console.log(`[worker] Health check server listening on port ${PORT}`);
});

console.log("[worker] Competitor Pricing Radar worker started");
console.log("[worker] Scheduled to run daily at 02:00 UTC");

// Run immediately on startup for testing (comment out in production)
if (process.env.RUN_ON_START === "true") {
  runMonitoring().catch(console.error);
}
