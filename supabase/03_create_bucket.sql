-- ============================================================
--  EcoTrade – Storage Bucket: session-evidence
--  supabase/03_create_bucket.sql
--
--  INSTRUCCIONES:
--    Ejecutar en Supabase Dashboard → SQL Editor
--    Crea el bucket necessary para que los usuarios puedan
--    subir fotos de evidencia.
-- ============================================================

-- 1. Crear el bucket si no existe (importante: configurado como publico para facilitar el prototipo)
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-evidence', 'session-evidence', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Políticas de Seguridad (RLS) para el Storage

-- Eliminar políticas anteriores si existen para evitar duplicados
DROP POLICY IF EXISTS "Public View Evidence" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Upload Evidence" ON storage.objects;
DROP POLICY IF EXISTS "Operators Any Action Evidence" ON storage.objects;

-- Política 1: Cualquiera puede ver las imágenes (es un bucket público)
CREATE POLICY "Public View Evidence"
ON storage.objects FOR SELECT
USING ( bucket_id = 'session-evidence' );

-- Política 2: Usuarios autenticados pueden subir fotos al bucket
CREATE POLICY "Authenticated Users Upload Evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'session-evidence' );

-- Política 3: Operadores pueden hacer cualquier cosa
CREATE POLICY "Operators Any Action Evidence"
ON storage.objects ALL
TO authenticated
USING ( 
  bucket_id = 'session-evidence' 
  AND public.is_operator() 
)
WITH CHECK ( 
  bucket_id = 'session-evidence' 
  AND public.is_operator() 
);
