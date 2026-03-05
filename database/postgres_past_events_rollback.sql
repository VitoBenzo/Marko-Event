-- PostgreSQL rollback for past events migration
-- Date: 2026-03-05

BEGIN;

DROP TRIGGER IF EXISTS trg_past_events_set_updated_at ON past_events;
DROP FUNCTION IF EXISTS set_updated_at_timestamp();

ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_past_event_id_fkey;
DROP INDEX IF EXISTS idx_photos_past_event_id;
ALTER TABLE photos DROP COLUMN IF EXISTS past_event_id;

DROP INDEX IF EXISTS idx_past_events_created_at;
DROP TABLE IF EXISTS past_events;

COMMIT;
