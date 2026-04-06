-- Migration 030: fix stats functions
-- 1. Exclude future sessions (add session_date <= CURRENT_DATE everywhere)
-- 2. Add optional session_type filter to all 4 functions

-- ──────────────────────────────────────────────────────────────────────────
-- get_attendance_stats_year
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_attendance_stats_year(
  p_division_id  UUID,
  p_year         INTEGER DEFAULT NULL,
  p_session_type TEXT    DEFAULT NULL   -- 'sabado' | 'miercoles' | NULL = todos
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
    ON  ts.division_id   = p.division_id
    AND EXTRACT(YEAR FROM ts.session_date) = v_year
    AND ts.session_date <= CURRENT_DATE                                    -- FIX: no futuras
    AND (p_session_type IS NULL OR ts.session_type = p_session_type)      -- filtro opcional
  LEFT JOIN attendance_records ar
    ON ar.session_id = ts.id AND ar.player_id = p.id
  WHERE p.division_id = p_division_id AND p.active = TRUE
  GROUP BY p.id, p.first_name, p.last_name, p.photo_url, p.parent_name, p.parent_phone
  ORDER BY attendance_pct DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ──────────────────────────────────────────────────────────────────────────
-- get_attendance_stats_days
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_attendance_stats_days(
  p_division_id  UUID,
  p_days         INTEGER DEFAULT 30,
  p_session_type TEXT    DEFAULT NULL
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
    ON  ts.division_id  = p.division_id
    AND ts.session_date >= CURRENT_DATE - p_days
    AND ts.session_date <= CURRENT_DATE                                    -- FIX: no futuras
    AND (p_session_type IS NULL OR ts.session_type = p_session_type)
  LEFT JOIN attendance_records ar
    ON ar.session_id = ts.id AND ar.player_id = p.id
  WHERE p.division_id = p_division_id AND p.active = TRUE
  GROUP BY p.id, p.first_name, p.last_name, p.photo_url, p.parent_name, p.parent_phone
  ORDER BY attendance_pct DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ──────────────────────────────────────────────────────────────────────────
-- get_attendance_stats_since_alta
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_attendance_stats_since_alta(
  p_division_id  UUID,
  p_session_type TEXT DEFAULT NULL
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
    ON  ts.division_id  = p.division_id
    AND ts.session_date >= p.fecha_alta
    AND ts.session_date <= CURRENT_DATE                                    -- FIX: no futuras
    AND (p_session_type IS NULL OR ts.session_type = p_session_type)
  LEFT JOIN attendance_records ar
    ON ar.session_id = ts.id AND ar.player_id = p.id
  WHERE p.division_id = p_division_id AND p.active = TRUE
  GROUP BY p.id, p.first_name, p.last_name, p.photo_url, p.parent_name, p.parent_phone
  ORDER BY attendance_pct DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ──────────────────────────────────────────────────────────────────────────
-- get_attendance_stats_sessions  (fix: exclude future sessions in ID selection)
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_attendance_stats_sessions(
  p_division_id  UUID,
  p_sessions     INTEGER DEFAULT 10,
  p_session_type TEXT    DEFAULT NULL
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
  v_session_ids UUID[];
BEGIN
  SELECT ARRAY(
    SELECT id FROM training_sessions
    WHERE division_id   = p_division_id
      AND session_date <= CURRENT_DATE                                     -- FIX: no futuras
      AND (p_session_type IS NULL OR session_type = p_session_type)
    ORDER BY session_date DESC
    LIMIT p_sessions
  ) INTO v_session_ids;

  RETURN QUERY
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.photo_url,
    p.parent_name,
    p.parent_phone,
    COUNT(s.id),
    COUNT(ar.session_id) FILTER (WHERE ar.present = TRUE),
    ROUND(
      COUNT(ar.session_id) FILTER (WHERE ar.present = TRUE)::NUMERIC
      / NULLIF(COUNT(s.id), 0) * 100,
      1
    )
  FROM players p
  CROSS JOIN UNNEST(v_session_ids) AS sid
  JOIN training_sessions s ON s.id = sid
  LEFT JOIN attendance_records ar
    ON ar.session_id = s.id AND ar.player_id = p.id
  WHERE p.division_id = p_division_id AND p.active = TRUE
  GROUP BY p.id, p.first_name, p.last_name, p.photo_url, p.parent_name, p.parent_phone
  ORDER BY attendance_pct DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
