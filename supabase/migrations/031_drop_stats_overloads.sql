-- Migration 031: Drop old function overloads that conflict with migration 030
--
-- Problem: migration 030 used CREATE OR REPLACE with additional parameters.
-- In PostgreSQL, adding a parameter creates a NEW overload — it does NOT
-- replace the old signature. This causes an ambiguity error when calling
-- without p_session_type (the 'todo' mode), because PostgreSQL can't
-- decide between the 2-param (old) and 3-param (new) versions.
--
-- Fix: drop the old signatures explicitly.

DROP FUNCTION IF EXISTS get_attendance_stats_year(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_attendance_stats_days(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_attendance_stats_since_alta(UUID);
