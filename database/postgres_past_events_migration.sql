-- PostgreSQL migration for past events
-- Date: 2026-03-05

BEGIN;

-- 1) Table: past_events
CREATE TABLE IF NOT EXISTS past_events (
  id TEXT PRIMARY KEY,
  club_name VARCHAR(120) NOT NULL,
  date VARCHAR(60) NOT NULL,
  title VARCHAR(180),
  description VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional: keep title generated consistently if backend doesn't send it
UPDATE past_events
SET title = club_name || ' · ' || date
WHERE (title IS NULL OR BTRIM(title) = '');

-- 2) Link photos -> past_events (if photos table exists)
ALTER TABLE photos
ADD COLUMN IF NOT EXISTS past_event_id TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'photos_past_event_id_fkey'
  ) THEN
    ALTER TABLE photos
      ADD CONSTRAINT photos_past_event_id_fkey
      FOREIGN KEY (past_event_id)
      REFERENCES past_events(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_past_events_created_at ON past_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_past_event_id ON photos(past_event_id);

-- 4) Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_past_events_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_past_events_set_updated_at
    BEFORE UPDATE ON past_events
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END $$;

COMMIT;
