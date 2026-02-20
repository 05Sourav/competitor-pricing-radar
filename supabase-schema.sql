-- Run this in your Supabase SQL editor to set up the database

-- Monitors table: stores competitor URLs to watch
CREATE TABLE monitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  competitor_name TEXT NOT NULL,
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Snapshots table: stores daily page text snapshots
CREATE TABLE snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

-- Alerts table: stores detected pricing changes
CREATE TABLE alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  old_snapshot_id UUID REFERENCES snapshots(id),
  new_snapshot_id UUID REFERENCES snapshots(id),
  emailed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_monitors_email ON monitors(user_email);
CREATE INDEX idx_snapshots_monitor ON snapshots(monitor_id);
CREATE INDEX idx_snapshots_fetched ON snapshots(fetched_at DESC);
CREATE INDEX idx_alerts_monitor ON alerts(monitor_id);

-- Enable Row Level Security (optional but recommended for prod)
ALTER TABLE monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
