-- Tabla de colegios con aliases para búsqueda
CREATE TABLE IF NOT EXISTS schools (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name    TEXT NOT NULL,
  aliases TEXT,          -- palabras clave alternativas, separadas por coma
  active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer
CREATE POLICY "schools_read" ON schools
  FOR SELECT TO authenticated USING (true);

-- Todos los autenticados pueden insertar (entrenadores agregan colegios nuevos al vuelo)
CREATE POLICY "schools_insert" ON schools
  FOR INSERT TO authenticated WITH CHECK (true);

-- Solo admins pueden editar y desactivar
CREATE POLICY "schools_update" ON schools
  FOR UPDATE TO authenticated USING (get_user_role() = 'admin');

-- FK en jugadores
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS schools_name_idx ON schools USING gin(to_tsvector('spanish', name || ' ' || coalesce(aliases, '')));
