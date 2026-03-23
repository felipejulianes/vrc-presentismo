-- ============================================================
-- 004_functions.sql — Funciones SQL para stats y avance
-- ============================================================

-- ------------------------------------------------------------
-- Vista: estadísticas de asistencia por jugador y división
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW attendance_stats AS
SELECT
  p.id                   AS player_id,
  p.first_name,
  p.last_name,
  p.photo_url,
  p.division_id,
  p.parent_phone,
  p.parent_name,
  COUNT(ts.id)           AS total_sessions,
  COUNT(ar.session_id) FILTER (WHERE ar.present = TRUE)
                         AS sessions_present,
  ROUND(
    COUNT(ar.session_id) FILTER (WHERE ar.present = TRUE)::NUMERIC
    / NULLIF(COUNT(ts.id), 0) * 100,
    1
  )                      AS attendance_pct
FROM players p
JOIN training_sessions ts ON ts.division_id = p.division_id
LEFT JOIN attendance_records ar ON ar.session_id = ts.id AND ar.player_id = p.id
WHERE p.active = TRUE
GROUP BY p.id, p.first_name, p.last_name, p.photo_url, p.division_id, p.parent_phone, p.parent_name;

-- ------------------------------------------------------------
-- Función: estadísticas de los últimos N días
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_attendance_stats_days(
  p_division_id UUID,
  p_days INTEGER DEFAULT 30
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
  ORDER BY attendance_pct ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- Función: estadísticas de las últimas N sesiones
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_attendance_stats_sessions(
  p_division_id UUID,
  p_sessions INTEGER DEFAULT 10
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
  -- Obtener los IDs de las últimas N sesiones de la división
  SELECT ARRAY(
    SELECT id FROM training_sessions
    WHERE division_id = p_division_id
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
  CROSS JOIN (
    SELECT id FROM training_sessions WHERE id = ANY(v_session_ids)
  ) s
  LEFT JOIN attendance_records ar
    ON ar.session_id = s.id AND ar.player_id = p.id
  WHERE p.division_id = p_division_id AND p.active = TRUE
  GROUP BY p.id, p.first_name, p.last_name, p.photo_url, p.parent_name, p.parent_phone
  ORDER BY attendance_pct ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- Función: avance de categoría (usa service_role, bypassa RLS)
-- Mapa: M6→M7→M8→M9→M10→M11→M12→M13→M14→M15→M16→M17→M19→alumni
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION execute_annual_progression()
RETURNS JSONB AS $$
DECLARE
  progression_map JSONB := '{
    "M6":  "M7",
    "M7":  "M8",
    "M8":  "M9",
    "M9":  "M10",
    "M10": "M11",
    "M11": "M12",
    "M12": "M13",
    "M13": "M14",
    "M14": "M15",
    "M15": "M16",
    "M16": "M17",
    "M17": "M19",
    "M19": null
  }';
  rec RECORD;
  next_div_name TEXT;
  next_div_id UUID;
  moved_count INTEGER := 0;
  deactivated_count INTEGER := 0;
  v_rows INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT d.id AS div_id, d.name AS div_name
    FROM divisions d
    ORDER BY d.sort_order
  LOOP
    next_div_name := progression_map ->> rec.div_name;

    IF next_div_name IS NULL THEN
      -- M19 → alumni (desactivar)
      UPDATE players SET active = FALSE
      WHERE division_id = rec.div_id AND active = TRUE;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      deactivated_count := deactivated_count + v_rows;
    ELSE
      SELECT id INTO next_div_id
      FROM divisions WHERE name = next_div_name;

      UPDATE players SET division_id = next_div_id
      WHERE division_id = rec.div_id AND active = TRUE;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      moved_count := moved_count + v_rows;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'moved', moved_count,
    'deactivated', deactivated_count,
    'executed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Preview del avance (sin ejecutar)
CREATE OR REPLACE FUNCTION preview_annual_progression()
RETURNS TABLE (
  current_division  TEXT,
  next_division     TEXT,
  player_count      BIGINT
) AS $$
DECLARE
  progression_map JSONB := '{
    "M6":  "M7",  "M7":  "M8",  "M8":  "M9",  "M9":  "M10",
    "M10": "M11", "M11": "M12", "M12": "M13", "M13": "M14",
    "M14": "M15", "M15": "M16", "M16": "M17", "M17": "M19",
    "M19": null
  }';
BEGIN
  RETURN QUERY
  SELECT
    d.name,
    COALESCE(progression_map ->> d.name, 'alumni (baja)'),
    COUNT(p.id)
  FROM divisions d
  LEFT JOIN players p ON p.division_id = d.id AND p.active = TRUE
  GROUP BY d.id, d.name, d.sort_order
  ORDER BY d.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
