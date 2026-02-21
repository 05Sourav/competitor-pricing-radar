-- Migration: Add last_checked_at column to monitors table
-- Feature 3: 24-hour check cooldown
--
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor).
-- Safe to run multiple times thanks to IF NOT EXISTS.

ALTER TABLE monitors
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ NULL;

-- Optional: index to help worker queries that filter by last_checked_at
CREATE INDEX IF NOT EXISTS idx_monitors_last_checked ON monitors(last_checked_at);
