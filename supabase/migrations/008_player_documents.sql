-- ============================================================
-- 008_player_documents.sql — Documentación de jugadores
-- ============================================================

CREATE TABLE IF NOT EXISTS player_documents (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  doc_type     TEXT NOT NULL CHECK (doc_type IN ('dni', 'apto_medico', 'ficha')),
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by  UUID REFERENCES profiles(id),
  UNIQUE (player_id, doc_type)
);

-- RLS
ALTER TABLE player_documents ENABLE ROW LEVEL SECURITY;

-- Coaches ven docs de jugadores de sus divisiones; admins ven todo
CREATE POLICY "coaches can view docs of their divisions" ON player_documents
  FOR SELECT USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM players p
      JOIN coach_divisions cd ON cd.division_id = p.division_id
      WHERE p.id = player_documents.player_id
        AND cd.coach_id = auth.uid()
    )
  );

-- Coaches pueden insertar/actualizar/borrar docs de sus divisiones
CREATE POLICY "coaches can manage docs of their divisions" ON player_documents
  FOR ALL USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM players p
      JOIN coach_divisions cd ON cd.division_id = p.division_id
      WHERE p.id = player_documents.player_id
        AND cd.coach_id = auth.uid()
    )
  );
