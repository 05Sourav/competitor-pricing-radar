// worker/index.js
// Main background worker - runs daily via cron
// Responsibilities: fetch pages, compare snapshots, detect changes, send structured email alerts
// Health check server keeps Render free tier alive (ping via UptimeRobot every 5 min)

require("dotenv").config({ path: "../.env.local" });

const http = require("http");
const crypto = require("crypto");
const cron = require("node-cron");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");
const { scrapePage } = require("./scraper");
const { compareSnapshots, buildEmailDiffSnippet } = require("./diff");
const { detectChanges } = require("./detector");

// ---- Clients ----
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const resend = new Resend(process.env.RESEND_API_KEY);

// ---- Idempotency Helper ----
/**
 * Build a short deterministic hash for a detected change.
 * Two identical changes (same type + same values) hash to the same string,
 * so we can detect duplicates without re-reading the full snapshot.
 * @param {import('./detector').ChangeResult} changeResult
 * @returns {string}
 */
function buildChangeHash(changeResult) {
  const raw = `${changeResult.type}::${changeResult.old_value}::${changeResult.new_value}::${changeResult.plan}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

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
  // 24-hour cooldown: skip monitor if checked within the last 24h
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

  // Stamp last_checked_at after successful scrape + save
  await supabase
    .from("monitors")
    .update({ last_checked_at: new Date().toISOString() })
    .eq("id", monitor.id);

  // 5. If no previous snapshot, this is the baseline — nothing to compare
  if (!prevSnapshot) {
    console.log(
      `[worker] First snapshot saved for ${monitor.competitor_name} - baseline set`,
    );
    return;
  }

  // 6. Quick diff check — skip AI if no text changes at all
  const { hasChanges } = compareSnapshots(prevSnapshot.content, newContent);
  if (!hasChanges) {
    console.log(`[worker] No changes detected for ${monitor.competitor_name}`);
    return;
  }

  // 7. Call structured detector (replaces summarizeWithAI)
  const changeResult = await detectChanges(prevSnapshot.content, newContent);
  if (!changeResult) {
    console.log(
      `[worker] No meaningful pricing change for ${monitor.competitor_name}`,
    );
    return;
  }

  console.log(
    `[worker] PRICING CHANGE DETECTED for ${monitor.competitor_name}: [${changeResult.type}] ${changeResult.summary}`,
  );

  // 8. Idempotency: skip if this exact change was already alerted
  const changeHash = buildChangeHash(changeResult);
  if (monitor.last_change_hash && monitor.last_change_hash === changeHash) {
    console.log(
      `[worker] Skipping ${monitor.competitor_name} — identical change already alerted (hash: ${changeHash.slice(0, 8)}...)`,
    );
    return;
  }

  // 9. Save structured alert to DB
  const { data: alert, error: alertError } = await supabase
    .from("alerts")
    .insert({
      monitor_id: monitor.id,
      summary: changeResult.summary,
      old_snapshot_id: prevSnapshot.id,
      new_snapshot_id: newSnapshot.id,
      change_type: changeResult.type,
      old_value: changeResult.old_value,
      new_value: changeResult.new_value,
      plan_name: changeResult.plan,
      confidence_score: changeResult.confidence_score,
    })
    .select()
    .single();

  if (alertError) {
    console.error("[worker] Failed to save alert:", alertError.message);
    return;
  }

  // 10. Send structured email alert
  const detectedAt = new Date().toISOString();
  const diffSnippet = buildEmailDiffSnippet(prevSnapshot.content, newContent);

  try {
    await resend.emails.send({
      from: "Competitor Pricing Radar <alerts@pricingradar.xyz>",
      to: monitor.user_email,
      reply_to: "pricingradar@gmail.com",
      subject: `[PricingRadar] ${monitor.competitor_name} pricing changed`,
      html: buildEmailHtml(monitor, changeResult, detectedAt, diffSnippet),
      text: buildEmailText(monitor, changeResult, detectedAt, diffSnippet),
    });

    // Mark alert as emailed + update monitor change-tracking fields
    await Promise.all([
      supabase.from("alerts").update({ emailed: true }).eq("id", alert.id),
      supabase
        .from("monitors")
        .update({
          last_meaningful_change_at: detectedAt,
          last_change_type: changeResult.type,
          last_change_hash: changeHash,
        })
        .eq("id", monitor.id),
    ]);

    console.log(`[worker] Alert email sent to ${monitor.user_email}`);
  } catch (emailErr) {
    console.error("[worker] Email send failed:", emailErr.message);
  }
}

// ---- Change Type Labels ----
const CHANGE_TYPE_LABELS = {
  price_change: "Price Change",
  tier_change: "Plan / Tier Change",
  feature_change: "Feature List Change",
  copy_change: "Copy Change",
};

// ---- Email HTML ----
function buildEmailHtml(monitor, change, detectedAt, diffSnippet) {
  const typeLabel = CHANGE_TYPE_LABELS[change.type] || change.type;
  const detectedDate = new Date(detectedAt).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });

  // Colour the type badge
  const badgeColors = {
    price_change: { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" },
    tier_change: { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af" },
    feature_change: { bg: "#f0fdf4", border: "#22c55e", text: "#166534" },
    copy_change: { bg: "#fafaf9", border: "#a8a29e", text: "#44403c" },
  };
  const badge = badgeColors[change.type] || badgeColors.copy_change;

  // Build the diff snippet block (only if non-trivial)
  const diffBlock =
    diffSnippet && diffSnippet !== "(no diff snippet available)"
      ? `<tr><td style="padding:0 40px 28px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.5px;">Page Diff (preview)</p>
        <pre style="background:#18181b;color:#d4d4d8;font-size:12px;line-height:1.6;padding:14px 16px;border-radius:8px;overflow-x:auto;margin:0;white-space:pre-wrap;word-break:break-word;">${diffSnippet
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/^(-.+)$/gm, '<span style="color:#f87171">$1</span>')
          .replace(/^(\+.+)$/gm, '<span style="color:#4ade80">$1</span>')}</pre>
      </td></tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.10);">

        <!-- Header -->
        <tr><td style="background:#18181b;padding:24px 40px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Competitor Pricing Radar</p>
        </td></tr>

        <!-- Title row -->
        <tr><td style="padding:32px 40px 4px;">
          <p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#18181b;">Pricing Change Detected</p>
          <p style="margin:0;font-size:14px;color:#71717a;">on <strong style="color:#18181b;">${monitor.competitor_name}</strong></p>
        </td></tr>

        <!-- Change type badge -->
        <tr><td style="padding:20px 40px 0;">
          <span style="display:inline-block;background:${badge.bg};border:1px solid ${badge.border};color:${badge.text};font-size:12px;font-weight:600;padding:4px 12px;border-radius:99px;">${typeLabel}</span>
        </td></tr>

        <!-- Change details table -->
        <tr><td style="padding:24px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
            ${
              change.plan && change.plan !== "Unknown"
                ? `
            <tr style="border-bottom:1px solid #e4e4e7;">
              <td style="padding:12px 16px;font-size:13px;color:#71717a;background:#fafafa;width:38%;border-right:1px solid #e4e4e7;">Plan</td>
              <td style="padding:12px 16px;font-size:13px;color:#18181b;font-weight:600;">${change.plan}</td>
            </tr>`
                : ""
            }
            ${
              change.old_value
                ? `
            <tr style="border-bottom:1px solid #e4e4e7;">
              <td style="padding:12px 16px;font-size:13px;color:#71717a;background:#fafafa;border-right:1px solid #e4e4e7;">Before</td>
              <td style="padding:12px 16px;font-size:13px;color:#dc2626;font-weight:600;">${change.old_value}</td>
            </tr>`
                : ""
            }
            ${
              change.new_value
                ? `
            <tr style="border-bottom:1px solid #e4e4e7;">
              <td style="padding:12px 16px;font-size:13px;color:#71717a;background:#fafafa;border-right:1px solid #e4e4e7;">Now</td>
              <td style="padding:12px 16px;font-size:13px;color:#16a34a;font-weight:600;">${change.new_value}</td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding:12px 16px;font-size:13px;color:#71717a;background:#fafafa;border-right:1px solid #e4e4e7;">Detected</td>
              <td style="padding:12px 16px;font-size:13px;color:#18181b;">${detectedDate}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Summary sentence -->
        <tr><td style="padding:0 40px 24px;">
          <div style="background:#fefce8;border-left:4px solid #facc15;border-radius:6px;padding:14px 16px;">
            <p style="margin:0;font-size:14px;color:#78350f;">${change.summary}</p>
          </div>
        </td></tr>

        <!-- Diff snippet -->
        ${diffBlock}

        <!-- Source URL -->
        <tr><td style="padding:0 40px 32px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.5px;">Source URL</p>
          <a href="${monitor.url}" style="font-size:13px;color:#3b82f6;word-break:break-all;">${monitor.url}</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid #f4f4f5;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">You're receiving this because you signed up at pricingradar.xyz</p>
          <p style="margin:6px 0 0;font-size:12px;color:#a1a1aa;">To unsubscribe, reply with 'unsubscribe' in the subject line.</p>
          <p style="margin:6px 0 0;font-size:12px;color:#a1a1aa;">pricingradar.xyz | contact: pricingradar@gmail.com</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---- Email Plain Text ----
function buildEmailText(monitor, change, detectedAt, diffSnippet) {
  const typeLabel = CHANGE_TYPE_LABELS[change.type] || change.type;
  const detectedDate = new Date(detectedAt).toUTCString();

  const lines = [
    `[PricingRadar] Competitor Pricing Changed`,
    ``,
    `Competitor: ${monitor.competitor_name}`,
    ``,
    `CHANGE DETAILS`,
    `--------------`,
    `Change Type : ${typeLabel}`,
  ];

  if (change.plan && change.plan !== "Unknown")
    lines.push(`Plan        : ${change.plan}`);
  if (change.old_value) lines.push(`Old Value   : ${change.old_value}`);
  if (change.new_value) lines.push(`New Value   : ${change.new_value}`);
  lines.push(`Detected    : ${detectedDate}`);
  lines.push(``);
  lines.push(`Summary: ${change.summary}`);

  if (diffSnippet && diffSnippet !== "(no diff snippet available)") {
    lines.push(``);
    lines.push(`PAGE DIFF (PREVIEW)`);
    lines.push(`-------------------`);
    lines.push(diffSnippet);
  }

  lines.push(``);
  lines.push(`Source URL: ${monitor.url}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(
    `You're receiving this because you signed up at pricingradar.xyz.`,
  );
  lines.push(`To unsubscribe, reply with 'unsubscribe' in the subject line.`);
  lines.push(`pricingradar.xyz | contact: pricingradar@gmail.com`);

  return lines.join("\n");
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
const PORT = process.env.PORT || 3001;

const healthServer = http.createServer((req, res) => {
  const method = req.method;
  const url = req.url;

  if ((method === "GET" || method === "HEAD") && url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
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
