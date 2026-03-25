-- Migration 015: Tercer tiempo enhancements
--
-- 1. Add coach_declared_kids / coach_declared_coaches to tercer_tiempo_reports
--    These are filled by the COACH from their attendance page.
--    local_kids_count / local_coaches_count remain as COORDINATOR's confirmed values.
--
-- 2. Add tercer_tiempo_time TIME to tercer_tiempo_reports
--    Set by the coordinator to communicate what time the 3rd half starts.

ALTER TABLE tercer_tiempo_reports
  ADD COLUMN IF NOT EXISTS coach_declared_kids INT,
  ADD COLUMN IF NOT EXISTS coach_declared_coaches INT,
  ADD COLUMN IF NOT EXISTS tercer_tiempo_time TIME;

-- Migrate existing data: records entered by coaches go to declared fields
-- (local_kids_count was previously the only field, entered by either role)
UPDATE tercer_tiempo_reports
SET coach_declared_kids = local_kids_count,
    coach_declared_coaches = local_coaches_count
WHERE coach_declared_kids IS NULL;
