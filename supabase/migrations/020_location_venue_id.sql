-- ============================================================
-- 020_location_venue_id.sql
-- Agrega location_venue_id a division_activities para
-- referenciar la sede específica (club_venues) en lugar
-- de solo el club (opponent_clubs).
-- ============================================================

ALTER TABLE division_activities
  ADD COLUMN IF NOT EXISTS location_venue_id UUID REFERENCES club_venues(id) ON DELETE SET NULL;
