-- Segundo referente en jugadores
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS parent_name_2  TEXT,
  ADD COLUMN IF NOT EXISTS parent_phone_2 TEXT;

-- Patente en bondis
ALTER TABLE event_buses
  ADD COLUMN IF NOT EXISTS patente TEXT;
