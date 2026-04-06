-- ============================================================
-- 027_tutora_role.sql — Rol tutora + entrevistas + visitas a colegios
-- ============================================================

-- ------------------------------------------------------------
-- 1. Nuevo rol 'tutora' en profiles
-- ------------------------------------------------------------
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'coach', 'tutora'));

-- ------------------------------------------------------------
-- 2. Campo grado en jugadores (ej: "3° ESB", "1° Polimodal")
-- ------------------------------------------------------------
ALTER TABLE players ADD COLUMN IF NOT EXISTS grado TEXT;

-- ------------------------------------------------------------
-- 3. Tabla de entrevistas de tutoras con jugadores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_interviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  interview_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  interviewer_id   UUID REFERENCES profiles(id),
  grado            TEXT,
  colegio_snapshot TEXT,   -- colegio al momento de la entrevista
  notas            TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_interviews_player
  ON player_interviews(player_id, interview_date DESC);

ALTER TABLE player_interviews ENABLE ROW LEVEL SECURITY;

-- Tutoras y admins ven todas; coaches ven las de sus divisiones
CREATE POLICY "interviews_select" ON player_interviews FOR SELECT USING (
  get_user_role() IN ('admin', 'tutora')
  OR EXISTS (
    SELECT 1 FROM players p
    JOIN coach_divisions cd ON cd.division_id = p.division_id
    WHERE p.id = player_interviews.player_id AND cd.coach_id = auth.uid()
  )
);

-- Solo tutoras y admins pueden crear entrevistas
CREATE POLICY "interviews_insert" ON player_interviews FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'tutora')
);

-- Solo la entrevistadora o admin pueden borrar
CREATE POLICY "interviews_delete" ON player_interviews FOR DELETE USING (
  interviewer_id = auth.uid() OR get_user_role() = 'admin'
);

-- ------------------------------------------------------------
-- 4. Tabla de visitas a colegios
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS school_visits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  visit_date   DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'planificada'
               CHECK (status IN ('planificada', 'realizada', 'cancelada')),
  division_ids UUID[] DEFAULT '{}',   -- divisiones objetivo de la visita
  notas        TEXT,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_visits_school
  ON school_visits(school_id, visit_date DESC);

ALTER TABLE school_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_visits_all" ON school_visits FOR ALL USING (
  get_user_role() IN ('admin', 'tutora')
);

-- ------------------------------------------------------------
-- 5. Actualizar RLS de players para tutora (acceso total)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "players_select" ON players;
DROP POLICY IF EXISTS "players_update" ON players;

CREATE POLICY "players_select" ON players FOR SELECT USING (
  get_user_role() IN ('admin', 'tutora')
  OR coach_has_division(division_id)
);

CREATE POLICY "players_update" ON players FOR UPDATE USING (
  get_user_role() IN ('admin', 'tutora')
  OR coach_has_division(division_id)
);

-- ------------------------------------------------------------
-- 6. Actualizar RLS de player_documents para tutora
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "coaches can view docs of their divisions" ON player_documents;
DROP POLICY IF EXISTS "coaches can manage docs of their divisions" ON player_documents;

CREATE POLICY "docs_select" ON player_documents FOR SELECT USING (
  get_user_role() IN ('admin', 'tutora')
  OR EXISTS (
    SELECT 1 FROM players p
    JOIN coach_divisions cd ON cd.division_id = p.division_id
    WHERE p.id = player_documents.player_id AND cd.coach_id = auth.uid()
  )
);

CREATE POLICY "docs_all" ON player_documents FOR ALL USING (
  get_user_role() IN ('admin', 'tutora')
  OR EXISTS (
    SELECT 1 FROM players p
    JOIN coach_divisions cd ON cd.division_id = p.division_id
    WHERE p.id = player_documents.player_id AND cd.coach_id = auth.uid()
  )
);

-- ------------------------------------------------------------
-- 7. Actualizar RLS de player_notes para tutora
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "player_notes_select" ON player_notes;
DROP POLICY IF EXISTS "player_notes_insert" ON player_notes;

CREATE POLICY "player_notes_select" ON player_notes FOR SELECT USING (
  get_user_role() IN ('admin', 'tutora')
  OR EXISTS (
    SELECT 1 FROM players p
    JOIN coach_divisions cd ON cd.division_id = p.division_id
    WHERE p.id = player_notes.player_id AND cd.coach_id = auth.uid()
  )
);

CREATE POLICY "player_notes_insert" ON player_notes FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'tutora')
  OR EXISTS (
    SELECT 1 FROM players p
    JOIN coach_divisions cd ON cd.division_id = p.division_id
    WHERE p.id = player_notes.player_id AND cd.coach_id = auth.uid()
  )
);

-- ------------------------------------------------------------
-- 8. Actualizar RLS de player_followups para tutora
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "player_followups_select" ON player_followups;
DROP POLICY IF EXISTS "player_followups_insert" ON player_followups;

CREATE POLICY "player_followups_select" ON player_followups FOR SELECT USING (
  get_user_role() IN ('admin', 'tutora')
  OR EXISTS (
    SELECT 1 FROM players p
    JOIN coach_divisions cd ON cd.division_id = p.division_id
    WHERE p.id = player_followups.player_id AND cd.coach_id = auth.uid()
  )
);

CREATE POLICY "player_followups_insert" ON player_followups FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'tutora')
  OR EXISTS (
    SELECT 1 FROM players p
    JOIN coach_divisions cd ON cd.division_id = p.division_id
    WHERE p.id = player_followups.player_id AND cd.coach_id = auth.uid()
  )
);
