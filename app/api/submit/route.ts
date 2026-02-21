// app/api/submit/route.ts
// API endpoint to add a new competitor URL to monitor
// Protected by: email limit, global cap, duplicate check, safe error handling

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkEmailMonitorLimit, checkGlobalMonitorCapacity } from '@/lib/safety/monitorLimits';
import { successResponse, errorResponse, handleApiError } from '@/lib/safety/apiResponse';

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
    const { data, error } = await supabase
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

    // ── Feature 4: Structured success response ────────────────────────────────
    return successResponse({ monitor: data }, 201);

  } catch (err) {
    // ── Feature 4: Safe catch-all — never expose internals ────────────────────
    return handleApiError(err);
  }
}
