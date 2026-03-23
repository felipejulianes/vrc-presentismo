-- ============================================================
-- 003_seed_divisions.sql — Divisiones del club VRC
-- ============================================================

INSERT INTO divisions (name, category, sort_order, min_age, max_age) VALUES
  ('M6',  'prerugby',  1,  5,  6),
  ('M7',  'prerugby',  2,  6,  7),
  ('M8',  'prerugby',  3,  7,  8),
  ('M9',  'infantil',  4,  8,  9),
  ('M10', 'infantil',  5,  9,  10),
  ('M11', 'infantil',  6,  10, 11),
  ('M12', 'infantil',  7,  11, 12),
  ('M13', 'infantil',  8,  12, 13),
  ('M14', 'infantil',  9,  13, 14),
  ('M15', 'juveniles', 10, 14, 15),
  ('M16', 'juveniles', 11, 15, 16),
  ('M17', 'juveniles', 12, 16, 17),
  ('M19', 'juveniles', 13, 17, 19)
ON CONFLICT (name) DO NOTHING;
