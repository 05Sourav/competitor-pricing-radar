// lib/safety/monitorLimits.ts
// Feature 1 & 2: Email monitor limit + global monitor cap

import { getAdminClient } from '@/lib/supabase';

const EMAIL_MONITOR_LIMIT = 3;
const GLOBAL_MONITOR_CAP = 500;

/**
 * Feature 1 — Per-email monitor limit (max 3 during beta).
 * Uses a COUNT-only query — no rows are fetched.
 */
export async function checkEmailMonitorLimit(
  email: string
): Promise<{ limited: boolean; count?: number }> {
  const supabase = getAdminClient();

  const { count, error } = await supabase
    .from('monitors')
    .select('*', { count: 'exact', head: true })
    .eq('user_email', email);

  if (error) {
    // Propagate so the caller can handle via handleApiError
    throw new Error(`Failed to check email monitor limit: ${error.message}`);
  }

  const total = count ?? 0;
  return { limited: total >= EMAIL_MONITOR_LIMIT, count: total };
}

/**
 * Feature 2 — Global monitor cap (max 500 total).
 * Acts as a safety valve against runaway infrastructure costs.
 * Uses a COUNT-only query — no rows are fetched.
 */
export async function checkGlobalMonitorCapacity(): Promise<{
  limited: boolean;
  count?: number;
}> {
  const supabase = getAdminClient();

  const { count, error } = await supabase
    .from('monitors')
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`Failed to check global monitor capacity: ${error.message}`);
  }

  const total = count ?? 0;
  return { limited: total >= GLOBAL_MONITOR_CAP, count: total };
}
