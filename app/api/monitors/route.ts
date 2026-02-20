// app/api/monitors/route.ts
// Returns monitors and their recent alerts for a given email

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'email query param required' }, { status: 400 });
  }

  const supabase = getAdminClient();

  const { data: monitors, error } = await supabase
    .from('monitors')
    .select(`
      *,
      alerts (
        id,
        summary,
        created_at,
        emailed
      )
    `)
    .eq('user_email', email)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch monitors' }, { status: 500 });
  }

  return NextResponse.json({ monitors });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400 });
  }

  const supabase = getAdminClient();

  const { error } = await supabase.from('monitors').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete monitor' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
