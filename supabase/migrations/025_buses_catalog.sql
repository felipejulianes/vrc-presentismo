-- ============================================================
-- 023_buses_catalog.sql
-- Catálogo global de bondis (reemplaza event_buses por-fecha)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Nueva tabla catálogo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS buses (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label        TEXT NOT NULL,          -- "Bondi 1", "Bondi Grca"
  patente      TEXT,
  driver_name  TEXT,
  driver_phone TEXT,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE buses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buses_select" ON buses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "buses_insert" ON buses FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "buses_update" ON buses FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "buses_delete" ON buses FOR DELETE USING (get_user_role() = 'admin');

-- ------------------------------------------------------------
-- 2. Migrar datos de event_buses → buses (deduplicando por label)
-- ------------------------------------------------------------
INSERT INTO buses (id, label, patente, driver_phone, created_at)
SELECT DISTINCT ON (label)
  gen_random_uuid(),
  label,
  patente,
  driver_phone,
  MIN(created_at) OVER (PARTITION BY label)
FROM event_buses
ORDER BY label, created_at;

-- ------------------------------------------------------------
-- 3. Actualizar FK de division_activities: event_buses → buses
-- ------------------------------------------------------------

-- Primero agregar columna temporal para mapeo
ALTER TABLE division_activities ADD COLUMN IF NOT EXISTS bus_id_new UUID REFERENCES buses(id) ON DELETE SET NULL;

-- Mapear bus_id viejo → nuevo usando label
UPDATE division_activities da
SET bus_id_new = b.id
FROM event_buses eb
JOIN buses b ON b.label = eb.label
WHERE da.bus_id = eb.id;

-- Reemplazar columna
ALTER TABLE division_activities DROP COLUMN bus_id;
ALTER TABLE division_activities RENAME COLUMN bus_id_new TO bus_id;

-- Índice
CREATE INDEX IF NOT EXISTS idx_division_activities_bus_id ON division_activities(bus_id);

-- ------------------------------------------------------------
-- 4. Eliminar tabla vieja (ya no se usa)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS event_buses CASCADE;
