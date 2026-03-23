-- ============================================================
-- 002_rls.sql — Row Level Security
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE divisions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_divisions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE players           ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Funciones helper
-- ------------------------------------------------------------

-- Retorna el rol del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifica si el coach autenticado tiene asignada una división
CREATE OR REPLACE FUNCTION coach_has_division(div_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM coach_divisions
    WHERE coach_id = auth.uid() AND division_id = div_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- DIVISIONS — todos leen, solo admin escribe
-- ------------------------------------------------------------
CREATE POLICY "divisions_select" ON divisions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "divisions_insert" ON divisions
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "divisions_update" ON divisions
  FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "divisions_delete" ON divisions
  FOR DELETE USING (get_user_role() = 'admin');

-- ------------------------------------------------------------
-- PROFILES — cada usuario ve su perfil; admin ve todos
-- ------------------------------------------------------------
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR get_user_role() = 'admin'
  );

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (
    auth.uid() = id OR get_user_role() = 'admin'
  );

-- ------------------------------------------------------------
-- COACH_DIVISIONS — coach ve las suyas; admin gestiona todo
-- ------------------------------------------------------------
CREATE POLICY "coach_divisions_select" ON coach_divisions
  FOR SELECT USING (
    coach_id = auth.uid() OR get_user_role() = 'admin'
  );

CREATE POLICY "coach_divisions_all_admin" ON coach_divisions
  FOR ALL USING (get_user_role() = 'admin');

-- ------------------------------------------------------------
-- PLAYERS — coach ve/edita jugadores de sus divisiones; admin todo
-- ------------------------------------------------------------
CREATE POLICY "players_select" ON players
  FOR SELECT USING (
    get_user_role() = 'admin'
    OR coach_has_division(division_id)
  );

CREATE POLICY "players_insert" ON players
  FOR INSERT WITH CHECK (
    get_user_role() = 'admin'
    OR coach_has_division(division_id)
  );

CREATE POLICY "players_update" ON players
  FOR UPDATE USING (
    get_user_role() = 'admin'
    OR coach_has_division(division_id)
  );

CREATE POLICY "players_delete" ON players
  FOR DELETE USING (get_user_role() = 'admin');

-- ------------------------------------------------------------
-- TRAINING_SESSIONS — ídem players
-- ------------------------------------------------------------
CREATE POLICY "sessions_select" ON training_sessions
  FOR SELECT USING (
    get_user_role() = 'admin'
    OR coach_has_division(division_id)
  );

CREATE POLICY "sessions_insert" ON training_sessions
  FOR INSERT WITH CHECK (
    get_user_role() = 'admin'
    OR coach_has_division(division_id)
  );

CREATE POLICY "sessions_update" ON training_sessions
  FOR UPDATE USING (
    get_user_role() = 'admin'
    OR coach_has_division(division_id)
  );

CREATE POLICY "sessions_delete" ON training_sessions
  FOR DELETE USING (
    get_user_role() = 'admin'
    OR coach_has_division(division_id)
  );

-- ------------------------------------------------------------
-- ATTENDANCE_RECORDS — acceso según la división de la sesión
-- ------------------------------------------------------------
CREATE POLICY "attendance_select" ON attendance_records
  FOR SELECT USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM training_sessions ts
      WHERE ts.id = session_id
        AND coach_has_division(ts.division_id)
    )
  );

CREATE POLICY "attendance_insert" ON attendance_records
  FOR INSERT WITH CHECK (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM training_sessions ts
      WHERE ts.id = session_id
        AND coach_has_division(ts.division_id)
    )
  );

CREATE POLICY "attendance_update" ON attendance_records
  FOR UPDATE USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM training_sessions ts
      WHERE ts.id = session_id
        AND coach_has_division(ts.division_id)
    )
  );

CREATE POLICY "attendance_delete" ON attendance_records
  FOR DELETE USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM training_sessions ts
      WHERE ts.id = session_id
        AND coach_has_division(ts.division_id)
    )
  );
