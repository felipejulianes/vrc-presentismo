-- Migration 013: Support multiple opponent clubs per division activity
-- Adds opponent_club_ids UUID[] alongside the existing opponent_club_id
-- (opponent_club_id is kept and populated with the first element for backwards compat)

ALTER TABLE division_activities
  ADD COLUMN IF NOT EXISTS opponent_club_ids UUID[] DEFAULT '{}';

-- Migrate existing single-club data into the array
UPDATE division_activities
SET opponent_club_ids = ARRAY[opponent_club_id]
WHERE opponent_club_id IS NOT NULL
  AND (opponent_club_ids IS NULL OR array_length(opponent_club_ids, 1) IS NULL);
