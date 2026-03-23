-- ============================================================
-- 010_saturday_events.sql
-- Actividades del sábado: config por división, bondis, tercer tiempo
-- ============================================================

-- ------------------------------------------------------------
-- Clubes rivales
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opponent_clubs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE opponent_clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opponent_clubs_select" ON opponent_clubs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "opponent_clubs_insert" ON opponent_clubs FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "opponent_clubs_update" ON opponent_clubs FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "opponent_clubs_delete" ON opponent_clubs FOR DELETE USING (get_user_role() = 'admin');

-- ------------------------------------------------------------
-- Bondis por fecha
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_buses (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_date   DATE NOT NULL,
  label        TEXT NOT NULL,        -- "Bondi 1", "Bondi 2"
  driver_phone TEXT,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_buses_date ON event_buses(event_date);

ALTER TABLE event_buses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_buses_select" ON event_buses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "event_buses_insert" ON event_buses FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "event_buses_update" ON event_buses FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "event_buses_delete" ON event_buses FOR DELETE USING (get_user_role() = 'admin');

-- ------------------------------------------------------------
-- Actividades por división y fecha
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS division_activities (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_date    DATE NOT NULL,
  division_id      UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  activity_type    TEXT NOT NULL CHECK (activity_type IN ('partido', 'entrenamiento')),
  venue            TEXT CHECK (venue IN ('local', 'visitante')),
  opponent_club_id UUID REFERENCES opponent_clubs(id),
  location_notes   TEXT,
  bus_id           UUID REFERENCES event_buses(id) ON DELETE SET NULL,
  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(activity_date, division_id)
);

CREATE INDEX idx_division_activities_date ON division_activities(activity_date);

ALTER TABLE division_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "division_activities_select" ON division_activities FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "division_activities_insert" ON division_activities FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "division_activities_update" ON division_activities FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "division_activities_delete" ON division_activities FOR DELETE USING (get_user_role() = 'admin');

-- ------------------------------------------------------------
-- Reporte de tercer tiempo / conteo del día
-- Tanto entrenadores como coordinación pueden reportar
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tercer_tiempo_reports (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_date         DATE NOT NULL,
  division_id           UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  local_kids_count      INT,
  local_coaches_count   INT,
  visitor_club_id       UUID REFERENCES opponent_clubs(id),
  visitor_kids_count    INT,
  visitor_coaches_count INT,
  notes                 TEXT,
  reported_by           UUID REFERENCES profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(activity_date, division_id)
);

CREATE INDEX idx_tercer_tiempo_date ON tercer_tiempo_reports(activity_date);

ALTER TABLE tercer_tiempo_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tercer_tiempo_select" ON tercer_tiempo_reports FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "tercer_tiempo_insert" ON tercer_tiempo_reports FOR INSERT WITH CHECK (
  get_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM coach_divisions cd
    WHERE cd.division_id = tercer_tiempo_reports.division_id AND cd.coach_id = auth.uid()
  )
);

CREATE POLICY "tercer_tiempo_update" ON tercer_tiempo_reports FOR UPDATE USING (
  get_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM coach_divisions cd
    WHERE cd.division_id = tercer_tiempo_reports.division_id AND cd.coach_id = auth.uid()
  )
);

CREATE POLICY "tercer_tiempo_delete" ON tercer_tiempo_reports FOR DELETE USING (get_user_role() = 'admin');
