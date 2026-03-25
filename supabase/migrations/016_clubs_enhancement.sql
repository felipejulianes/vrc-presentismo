-- Add coordinator fields to opponent_clubs
ALTER TABLE opponent_clubs
  ADD COLUMN IF NOT EXISTS coordinator_name TEXT,
  ADD COLUMN IF NOT EXISTS coordinator_phone TEXT,
  ADD COLUMN IF NOT EXISTS coordinator_notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Club venues (each club can have multiple playing venues)
CREATE TABLE IF NOT EXISTS club_venues (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id      UUID NOT NULL REFERENCES opponent_clubs(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,       -- "Campo principal", or same as club name
  address      TEXT,
  maps_url     TEXT,               -- full Google Maps URL or auto-generated from address
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_venues_club ON club_venues(club_id);
ALTER TABLE club_venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club_venues_select" ON club_venues FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "club_venues_insert" ON club_venues FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "club_venues_update" ON club_venues FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "club_venues_delete" ON club_venues FOR DELETE USING (get_user_role() = 'admin');
