-- Migration 029: Add lat/lng to club_venues
-- address and maps_url already exist from migration 016.
-- Adding coordinates enables precise Maps pins and future geo work.

ALTER TABLE club_venues
  ADD COLUMN IF NOT EXISTS lat  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng  DOUBLE PRECISION;

-- Existing rows keep their text-based maps_url (still works as fallback).
-- Use the in-app geocoding tool to normalize them to coordinate-based pins.
