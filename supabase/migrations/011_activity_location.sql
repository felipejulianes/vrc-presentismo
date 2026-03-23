-- ============================================================
-- 011_activity_location.sql
-- Agrega campo de sede (club donde se juega) a division_activities
-- ============================================================

ALTER TABLE division_activities
  ADD COLUMN IF NOT EXISTS location_club_id UUID REFERENCES opponent_clubs(id);
