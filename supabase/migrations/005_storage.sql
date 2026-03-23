-- ============================================================
-- 005_storage.sql — Bucket de fotos de jugadores
-- ============================================================

-- Crear bucket público para fotos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'player-photos',
  'player-photos',
  true,
  5242880,  -- 5 MB máximo por foto
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública (para mostrar fotos en la app sin auth)
CREATE POLICY "player_photos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'player-photos');

-- Subida: solo usuarios autenticados
CREATE POLICY "player_photos_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'player-photos'
    AND auth.role() = 'authenticated'
  );

-- Actualización: solo usuarios autenticados
CREATE POLICY "player_photos_auth_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'player-photos'
    AND auth.role() = 'authenticated'
  );

-- Borrado: solo admins
CREATE POLICY "player_photos_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'player-photos'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
