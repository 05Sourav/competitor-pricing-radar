// app/api/submit/route.ts
// API endpoint to add a new competitor URL to monitor
// Protected by: email limit, global cap, duplicate check, safe error handling

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAdminClient } from '@/lib/supabase';
import { checkEmailMonitorLimit, checkGlobalMonitorCapacity } from '@/lib/safety/monitorLimits';
import { successResponse, errorResponse, handleApiError } from '@/lib/safety/apiResponse';
import { scrapePage } from '@/lib/scraper';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, competitorName, url } = body;

    // ── Basic validation ──────────────────────────────────────────────────────
    if (!email || !competitorName || !url) {
      return errorResponse('email, competitorName, and url are required', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Invalid email address', 400);
    }

    try {
      new URL(url);
    } catch {
      return errorResponse('Invalid URL format', 400);
    }

    // ── Feature 2: Global monitor cap (max 500) ───────────────────────────────
    const globalCheck = await checkGlobalMonitorCapacity();
    if (globalCheck.limited) {
      return errorResponse('Beta capacity reached. Please try again later.', 503);
    }

    // ── Feature 1: Per-email monitor limit (max 3) ────────────────────────────
    const emailCheck = await checkEmailMonitorLimit(email);
    if (emailCheck.limited) {
      return errorResponse('Monitor limit reached (max 3 during beta).', 403);
    }

    const supabase = getAdminClient();

    // ── Duplicate check ───────────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from('monitors')
      .select('id')
      .eq('user_email', email)
      .eq('url', url)
      .single();

    if (existing) {
      return errorResponse('You are already monitoring this URL', 409);
    }

    // ── Insert new monitor ────────────────────────────────────────────────────
    const { data: monitor, error } = await supabase
      .from('monitors')
      .insert({
        user_email: email,
        competitor_name: competitorName,
        url: url,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[submit] DB insert error:', error);
      return errorResponse('Failed to save monitor', 500);
    }

    // ── INITIAL BASELINE SCRAPE ──────────────────────────────────────────────
    // We scrape immediately so the user doesn't see an empty dashboard.
    try {
      const content = await scrapePage(url);
      if (content) {
        await supabase.from('snapshots').insert({
          monitor_id: monitor.id,
          content: content,
        });

        // Also update last_checked_at
        await supabase
          .from('monitors')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('id', monitor.id);

        console.log(`[submit] Created initial baseline snapshot for ${competitorName}`);
      }
    } catch (scrapeErr) {
      console.error('[submit] Initial scrape failed:', scrapeErr);
      // Non-fatal: monitor is still created, worker will try again later.
    }

    // ── Confirmation email (fire-and-forget) ─────────────────────────────────
    try {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?email=${encodeURIComponent(email)}`;
      await resend.emails.send({
        from: 'Competitor Pricing Radar <alerts@pricingradar.xyz>',
        to: email,
        reply_to: 'pricingradar@gmail.com',
        subject: `Monitoring confirmed - ${competitorName}`,

        html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr><td style="background:#18181b;padding:28px 40px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Competitor Pricing Radar</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px 28px;">
          <p style="margin:0 0 6px;font-size:15px;color:#52525b;">Hi there,</p>
          <p style="margin:0 0 20px;font-size:13px;color:#a1a1aa;">You're receiving this because you signed up at pricingradar.xyz</p>
          <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#18181b;">You're all set</p>
          <p style="margin:0 0 28px;font-size:15px;color:#52525b;">We'll keep a close eye on <strong>${competitorName}</strong> and notify you when their pricing changes.</p>

          <!-- Highlight box -->
          <div style="background:#fefce8;border-left:4px solid #facc15;border-radius:6px;padding:18px 20px;margin-bottom:28px;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#78350f;text-transform:uppercase;letter-spacing:.5px;">Monitor details</p>
            <table cellpadding="0" cellspacing="0">
              <tr><td style="font-size:13px;color:#92400e;padding-bottom:6px;"><strong>Competitor:</strong></td><td style="font-size:13px;color:#1c1917;padding-bottom:6px;padding-left:12px;">${competitorName}</td></tr>
              <tr><td style="font-size:13px;color:#92400e;"><strong>URL:</strong></td><td style="font-size:13px;color:#1c1917;padding-left:12px;"><a href="${url}" style="color:#d97706;text-decoration:none;">${url}</a></td></tr>
            </table>
          </div>

          <p style="margin:0 0 28px;font-size:15px;color:#52525b;">Checks run <strong>daily</strong>. We'll email you at this address the moment we detect a pricing change — no action needed on your end.</p>

          <a href="${dashboardUrl}" style="display:inline-block;background:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">View Dashboard</a>
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
</html>`,
        text: `Hi there,

You're receiving this because you signed up at pricingradar.xyz.

Monitoring confirmed - ${competitorName}

We are now monitoring ${competitorName} (${url}) for pricing changes.
Checks run daily. We will email you the moment we detect a pricing change.

View your dashboard: ${dashboardUrl}

---
To unsubscribe, reply with 'unsubscribe' in the subject line.
pricingradar.xyz | contact: pricingradar@gmail.com`,
      });
    } catch (emailErr) {
      console.error('[submit] Confirmation email failed (non-fatal):', emailErr);
    }

    // ── Feature 4: Structured success response ────────────────────────────────
    return successResponse({ monitor }, 201);

  } catch (err) {
    // ── Feature 4: Safe catch-all — never expose internals ────────────────────
    return handleApiError(err);
  }
}
