-- ============================================================
-- 009_notes_and_followups.sql
-- Bitácora por jugador + Log de seguimiento de ausentes
-- ============================================================

-- ------------------------------------------------------------
-- Bitácora del entrenador (viaja con el jugador)
-- Visible para todos los que tienen acceso al jugador.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_notes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  note_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  content      TEXT NOT NULL,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_player_notes_player ON player_notes(player_id, note_date DESC);

ALTER TABLE player_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_notes_select" ON player_notes FOR SELECT USING (
  get_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM players p
    JOIN coach_divisions cd ON cd.division_id = p.division_id
    WHERE p.id = player_notes.player_id AND cd.coach_id = auth.uid()
  )
);

CREATE POLICY "player_notes_insert" ON player_notes FOR INSERT WITH CHECK (
  get_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM players p
    JOIN coach_divisions cd ON cd.division_id = p.division_id
    WHERE p.id = player_notes.player_id AND cd.coach_id = auth.uid()
  )
);

CREATE POLICY "player_notes_update" ON player_notes FOR UPDATE USING (
  created_by = auth.uid() OR get_user_role() = 'admin'
);

CREATE POLICY "player_notes_delete" ON player_notes FOR DELETE USING (
  created_by = auth.uid() OR get_user_role() = 'admin'
);

-- ------------------------------------------------------------
-- Seguimiento de ausentes
-- Registro de cada contacto con el padre/madre de un jugador.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_followups (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id      UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  contact_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  contact_type   TEXT NOT NULL CHECK (contact_type IN ('llamada', 'whatsapp', 'mensaje', 'reunion', 'otro')),
  notes          TEXT NOT NULL,
  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_player_followups_player ON player_followups(player_id, contact_date DESC);

ALTER TABLE player_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_followups_select" ON player_followups FOR SELECT USING (
  get_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM players p
    JOIN coach_divisions cd ON cd.division_id = p.division_id
    WHERE p.id = player_followups.player_id AND cd.coach_id = auth.uid()
  )
);

CREATE POLICY "player_followups_insert" ON player_followups FOR INSERT WITH CHECK (
  get_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM players p
    JOIN coach_divisions cd ON cd.division_id = p.division_id
    WHERE p.id = player_followups.player_id AND cd.coach_id = auth.uid()
  )
);

CREATE POLICY "player_followups_update" ON player_followups FOR UPDATE USING (
  created_by = auth.uid() OR get_user_role() = 'admin'
);

CREATE POLICY "player_followups_delete" ON player_followups FOR DELETE USING (
  created_by = auth.uid() OR get_user_role() = 'admin'
);
