-- ============================================================
-- 001_schema.sql — Esquema base de la app de presentismo VRC
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- Divisiones
-- ------------------------------------------------------------
CREATE TABLE divisions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,        -- 'M6', 'M7', ..., 'M19'
  category    TEXT NOT NULL,               -- 'prerugby', 'infantil', 'juveniles'
  sort_order  INTEGER NOT NULL,            -- para ordenar la lista
  min_age     INTEGER,
  max_age     INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Perfiles (extiende auth.users de Supabase)
-- ------------------------------------------------------------
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'coach')),
  full_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crear perfil automáticamente al registrar un usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'coach'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ------------------------------------------------------------
-- Relación coach ↔ divisiones
-- ------------------------------------------------------------
CREATE TABLE coach_divisions (
  coach_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  division_id  UUID REFERENCES divisions(id) ON DELETE CASCADE,
  PRIMARY KEY (coach_id, division_id)
);

-- ------------------------------------------------------------
-- Jugadores
-- ------------------------------------------------------------
CREATE TABLE players (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  dni           TEXT UNIQUE,
  birth_date    DATE,
  parent_name   TEXT,
  parent_phone  TEXT,
  photo_url     TEXT,
  division_id   UUID REFERENCES divisions(id),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- Sesiones de entrenamiento
-- ------------------------------------------------------------
CREATE TABLE training_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  division_id  UUID NOT NULL REFERENCES divisions(id),
  session_date DATE NOT NULL,
  created_by   UUID REFERENCES profiles(id),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (division_id, session_date)
);

-- ------------------------------------------------------------
-- Registros de asistencia
-- ------------------------------------------------------------
CREATE TABLE attendance_records (
  session_id  UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  present     BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (session_id, player_id)
);

-- Índices para queries frecuentes
CREATE INDEX idx_players_division ON players(division_id) WHERE active = TRUE;
CREATE INDEX idx_sessions_division_date ON training_sessions(division_id, session_date DESC);
CREATE INDEX idx_attendance_session ON attendance_records(session_id);
CREATE INDEX idx_attendance_player ON attendance_records(player_id);
