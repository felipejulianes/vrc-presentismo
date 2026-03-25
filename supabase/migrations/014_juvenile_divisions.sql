-- Migration 014: Mark juvenile divisions so they can be hidden from the app
-- Infantiles: M6–M14. Juveniles: M15, M16, M17, M19, alumni.

ALTER TABLE divisions
  ADD COLUMN IF NOT EXISTS is_juvenile BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE divisions
SET is_juvenile = TRUE
WHERE name IN ('M15', 'M16', 'M17', 'M19', 'alumni');
