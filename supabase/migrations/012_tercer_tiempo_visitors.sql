-- Migration 012: Multiple visitor clubs for tercer tiempo
-- Replaces the single visitor_* columns in tercer_tiempo_reports with a separate table
-- (existing columns are kept for backwards compatibility but will be ignored in the UI)

CREATE TABLE IF NOT EXISTS tercer_tiempo_visitors (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_date DATE NOT NULL,
  division_id   UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  club_id       UUID REFERENCES opponent_clubs(id) ON DELETE SET NULL,
  kids_count    INT,
  coaches_count INT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_date, division_id, club_id)
);

-- Index for fast lookups by date
CREATE INDEX IF NOT EXISTS idx_ttv_date ON tercer_tiempo_visitors(activity_date);

-- RLS
ALTER TABLE tercer_tiempo_visitors ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "authenticated can read tercer_tiempo_visitors"
  ON tercer_tiempo_visitors FOR SELECT
  TO authenticated
  USING (true);

-- Coaches can insert/update/delete rows for their own divisions
CREATE POLICY "coaches can manage tercer_tiempo_visitors"
  ON tercer_tiempo_visitors FOR ALL
  TO authenticated
  USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM coach_divisions
      WHERE coach_divisions.coach_id = auth.uid()
        AND coach_divisions.division_id = tercer_tiempo_visitors.division_id
    )
  )
  WITH CHECK (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM coach_divisions
      WHERE coach_divisions.coach_id = auth.uid()
        AND coach_divisions.division_id = tercer_tiempo_visitors.division_id
    )
  );
