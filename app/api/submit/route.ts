// app/api/submit/route.ts
// API endpoint to add a new competitor URL to monitor

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, competitorName, url } = body;

    // Basic validation
    if (!email || !competitorName || !url) {
      return NextResponse.json(
        { error: 'email, competitorName, and url are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Check if this email+url combo already exists
    const { data: existing } = await supabase
      .from('monitors')
      .select('id')
      .eq('user_email', email)
      .eq('url', url)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'You are already monitoring this URL' },
        { status: 409 }
      );
    }

    // Insert new monitor
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
      console.error('DB insert error:', error);
      return NextResponse.json({ error: 'Failed to save monitor' }, { status: 500 });
    }

    return NextResponse.json({ success: true, monitor: data }, { status: 201 });
  } catch (err) {
    console.error('Submit API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
