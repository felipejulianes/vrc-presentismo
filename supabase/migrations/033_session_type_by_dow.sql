-- 033_session_type_by_dow.sql
-- Cambio de esquema de entrenamiento: de miércoles (1 día) a martes+jueves (2 días)
-- a partir del 2026-08-04.
--
-- Se reemplaza la clasificación "por siembra manual" (migración 026) por
-- clasificación automática según el día de la semana (DOW), vía trigger.
--   Bucket 'sabado' = fin de semana  → sábado (DOW=6) o domingo (DOW=0)
--   Bucket 'semana' = entrenamiento  → cualquier otro día (lunes a viernes)

-- ── 1) Trigger: clasifica session_type por el día de session_date ──────────────
CREATE OR REPLACE FUNCTION set_session_type_by_dow()
RETURNS TRIGGER AS $$
BEGIN
  IF EXTRACT(DOW FROM NEW.session_date) IN (0, 6) THEN
    NEW.session_type := 'sabado';
  ELSE
    NEW.session_type := 'semana';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_session_type_by_dow ON training_sessions;
CREATE TRIGGER trg_session_type_by_dow
  BEFORE INSERT OR UPDATE ON training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_session_type_by_dow();

-- ── 2) Reclasificar todo el histórico según el mismo criterio DOW ──────────────
-- Migra los 'miercoles' existentes → 'semana' y normaliza cualquier sesión que
-- hubiera quedado con el default 'sabado' en un día de semana.
UPDATE training_sessions
SET session_type = CASE
  WHEN EXTRACT(DOW FROM session_date) IN (0, 6) THEN 'sabado'
  ELSE 'semana'
END;

-- ── 3) Borrar los miércoles futuros sembrados que ya no se entrenan ────────────
-- Solo los que no tienen lista tomada (no destruye asistencia registrada).
DELETE FROM training_sessions ts
WHERE EXTRACT(DOW FROM ts.session_date) = 3          -- miércoles
  AND ts.session_date >= '2026-08-04'
  AND NOT EXISTS (
    SELECT 1 FROM attendance_records ar WHERE ar.session_id = ts.id
  );

-- ── 4) Sembrar martes + jueves desde 2026-08-04 hasta fin de temporada ─────────
-- (mismo patrón que la siembra de miércoles de la migración 026)
DO $$
DECLARE
  d DATE;
  div RECORD;
BEGIN
  FOR div IN SELECT id FROM divisions WHERE name <> 'alumni' LOOP
    d := '2026-08-04';                                -- primer martes
    WHILE d <= '2026-11-30' LOOP
      -- martes
      INSERT INTO training_sessions (division_id, session_date, session_type)
      VALUES (div.id, d, 'semana')
      ON CONFLICT (division_id, session_date) DO NOTHING;
      -- jueves (martes + 2 días)
      INSERT INTO training_sessions (division_id, session_date, session_type)
      VALUES (div.id, (d + INTERVAL '2 days')::date, 'semana')
      ON CONFLICT (division_id, session_date) DO NOTHING;
      d := d + INTERVAL '7 days';
    END LOOP;
  END LOOP;
END $$;
