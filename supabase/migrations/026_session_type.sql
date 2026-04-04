-- Agregar session_type a training_sessions
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'sabado';

-- Bulk insert: todas las sesiones de miércoles para todas las divisiones
-- desde 2026-04-08 hasta 2026-11-25 (inclusive)
DO $$
DECLARE
  d DATE := '2026-04-08';
  div RECORD;
BEGIN
  WHILE d <= '2026-11-25' LOOP
    FOR div IN SELECT id FROM divisions WHERE name != 'alumni' LOOP
      INSERT INTO training_sessions (division_id, session_date, session_type)
      VALUES (div.id, d, 'miercoles')
      ON CONFLICT (division_id, session_date) DO NOTHING;
    END LOOP;
    d := d + INTERVAL '7 days';
  END LOOP;
END $$;
