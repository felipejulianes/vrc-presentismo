-- Migration 028: Add address fields to players and schools
-- Stores: address text (display), lat/lng (for future geo work), maps_url (deep link)

-- Players
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS address   TEXT,
  ADD COLUMN IF NOT EXISTS lat       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS maps_url  TEXT;

-- Schools
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS address   TEXT,
  ADD COLUMN IF NOT EXISTS lat       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS maps_url  TEXT;

-- Notes:
-- maps_url uses ?q=lat,lng format when coordinates are known (exact pin),
-- or ?q=<encoded_address> as fallback (text search).
-- lat/lng are stored to allow future PostGIS operations, distance queries,
-- map rendering, clustering, etc. without re-geocoding.
