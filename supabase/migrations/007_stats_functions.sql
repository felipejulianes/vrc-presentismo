-- ============================================================
-- 007_stats_functions.sql — Nuevas funciones de estadísticas
-- ============================================================

-- ------------------------------------------------------------
-- Función: estadísticas del año calendario actual
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_attendance_stats_year(
  p_division_id UUID,
  p_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
  player_id        UUID,
  first_name       TEXT,
  last_name        TEXT,
  photo_url        TEXT,
  parent_name      TEXT,
  parent_phone     TEXT,
  total_sessions   BIGINT,
  sessions_present BIGINT,
  attendance_pct   NUMERIC
) AS $$
DECLARE
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.photo_url,
    p.parent_name,
    p.parent_phone,
    COUNT(ts.id),
    COUNT(ar.session_id) FILTER (WHERE ar.present = TRUE),
    ROUND(
      COUNT(ar.session_id) FILTER (WHERE ar.present = TRUE)::NUMERIC
      / NULLIF(COUNT(ts.id), 0) * 100,
      1
    )
  FROM players p
  JOIN training_sessions ts
    ON ts.division_id = p.division_id
    AND EXTRACT(YEAR FROM ts.session_date) = v_year
  LEFT JOIN attendance_records ar
    ON ar.session_id = ts.id AND ar.player_id = p.id
  WHERE p.division_id = p_division_id AND p.active = TRUE
  GROUP BY p.id, p.first_name, p.last_name, p.photo_url, p.parent_name, p.parent_phone
  ORDER BY attendance_pct DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- Función: estadísticas desde la fecha de alta del jugador
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_attendance_stats_since_alta(
  p_division_id UUID
)
RETURNS TABLE (
  player_id        UUID,
  first_name       TEXT,
  last_name        TEXT,
  photo_url        TEXT,
  parent_name      TEXT,
  parent_phone     TEXT,
  total_sessions   BIGINT,
  sessions_present BIGINT,
  attendance_pct   NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.photo_url,
    p.parent_name,
    p.parent_phone,
    COUNT(ts.id),
    COUNT(ar.session_id) FILTER (WHERE ar.present = TRUE),
    ROUND(
      COUNT(ar.session_id) FILTER (WHERE ar.present = TRUE)::NUMERIC
      / NULLIF(COUNT(ts.id), 0) * 100,
      1
    )
  FROM players p
  JOIN training_sessions ts
    ON ts.division_id = p.division_id
    AND ts.session_date >= p.fecha_alta
  LEFT JOIN attendance_records ar
    ON ar.session_id = ts.id AND ar.player_id = p.id
  WHERE p.division_id = p_division_id AND p.active = TRUE
  GROUP BY p.id, p.first_name, p.last_name, p.photo_url, p.parent_name, p.parent_phone
  ORDER BY attendance_pct DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- Actualizar función de días para que también ordene DESC
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_attendance_stats_days(
  p_division_id UUID,
  p_days INTEGER DEFAULT 60
)
RETURNS TABLE (
  player_id        UUID,
  first_name       TEXT,
  last_name        TEXT,
  photo_url        TEXT,
  parent_name      TEXT,
  parent_phone     TEXT,
  total_sessions   BIGINT,
  sessions_present BIGINT,
  attendance_pct   NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.photo_url,
    p.parent_name,
    p.parent_phone,
    COUNT(ts.id),
    COUNT(ar.session_id) FILTER (WHERE ar.present = TRUE),
    ROUND(
      COUNT(ar.session_id) FILTER (WHERE ar.present = TRUE)::NUMERIC
      / NULLIF(COUNT(ts.id), 0) * 100,
      1
    )
  FROM players p
  JOIN training_sessions ts
    ON ts.division_id = p.division_id
    AND ts.session_date >= CURRENT_DATE - p_days
  LEFT JOIN attendance_records ar
    ON ar.session_id = ts.id AND ar.player_id = p.id
  WHERE p.division_id = p_division_id AND p.active = TRUE
  GROUP BY p.id, p.first_name, p.last_name, p.photo_url, p.parent_name, p.parent_phone
  ORDER BY attendance_pct DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
