ALTER TABLE players
  ADD COLUMN IF NOT EXISTS como_conocio TEXT;
-- Values: 'familiar_club' | 'amigo_barrio' | 'redes_sociales' | 'visita_colegio' | 'otro'
