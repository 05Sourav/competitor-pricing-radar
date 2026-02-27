-- Migration: Add structured change-tracking columns
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to run multiple times (uses IF NOT EXISTS)

-- monitors table: track last meaningful change metadata
ALTER TABLE monitors
  ADD COLUMN IF NOT EXISTS last_meaningful_change_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS last_change_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS last_change_hash TEXT NULL;

-- alerts table: store structured change fields
ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS change_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS old_value TEXT NULL,
  ADD COLUMN IF NOT EXISTS new_value TEXT NULL,
  ADD COLUMN IF NOT EXISTS plan_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS confidence_score FLOAT NULL;

-- Optional indexes
CREATE INDEX IF NOT EXISTS idx_monitors_change_hash ON monitors(last_change_hash);
CREATE INDEX IF NOT EXISTS idx_alerts_change_type   ON alerts(change_type);
