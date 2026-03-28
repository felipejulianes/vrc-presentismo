INSERT INTO schools (name, aliases) VALUES
  ('Madre Teresa', NULL),
  ('Escuela Primaria N°3 Virgen del Luján', 'la 30, escuela 30, virgen del lujan'),
  ('Escuela Secundaria N°14', NULL)
ON CONFLICT DO NOTHING;
