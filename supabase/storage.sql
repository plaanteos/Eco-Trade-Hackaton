-- ============================================================
--  EcoTrade – Supabase Storage: Bucket + Policies
--  Generado: 2026-03-20
--
--  INSTRUCCIONES:
--    Ejecutar DESPUÉS de schema.sql y rls.sql.
--    Requiere que el schema de storage ya exista (viene por
--    defecto en todos los proyectos Supabase).
-- ============================================================


-- ──────────────────────────────────────────────────────────
-- 1. BUCKET: session-evidence
--    - Público: cualquier URL pública es accesible (lectura)
--    - file_size_limit: 10 MB (10 * 1024 * 1024)
--    - allowed_mime_types: imagen estática/móvil
-- ──────────────────────────────────────────────────────────
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'session-evidence',
  'session-evidence',
  TRUE,                     -- público para lectura via URL
  10485760,                 -- 10 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ──────────────────────────────────────────────────────────
-- 2. POLÍTICAS DE STORAGE
--
--    Estructura de path obligatoria:
--      {user_id}/{session_id}/{filename}
--
--    Supabase Storage usa storage.foldername(name) para
--    extraer segmentos del path:
--      storage.foldername(name)[1] → user_id    (segmento 0-indexed en arreglo 1-indexed)
--      storage.foldername(name)[2] → session_id
-- ──────────────────────────────────────────────────────────

-- ── 2.1 UPLOAD (INSERT): solo usuarios autenticados ──────
--   El primer segmento del path DEBE ser el user_id del usuario.
--   Esto impide que un usuario suba archivos en nombre de otro.
CREATE POLICY "storage_evidence_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'session-evidence'
    -- El primer segmento del path debe coincidir con auth.uid()
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    -- El segundo segmento debe ser un UUID válido (session_id)
    AND (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

-- ── 2.2 READ (SELECT): público ──────────────────────────
--   Cualquier persona puede leer archivos del bucket
--   (necesario para verificación pública de evidencias).
CREATE POLICY "storage_evidence_read_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'session-evidence');

-- ── 2.3 UPDATE: nadie desde cliente ─────────────────────
--   Los archivos de evidencia son inmutables una vez subidos.
--   Sin política UPDATE → denegado por RLS.

-- ── 2.4 DELETE: dueño del archivo O operador ────────────
--   El dueño se identifica porque el primer segmento del path
--   coincide con su auth.uid(). Los operadores pueden eliminar
--   cualquier evidencia.
CREATE POLICY "storage_evidence_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'session-evidence'
    AND (
      -- Es el dueño del archivo (primer segmento = user_id)
      (storage.foldername(name))[1] = auth.uid()::TEXT
      -- O es operador
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'Operador'
      )
    )
  );


-- ──────────────────────────────────────────────────────────
-- 3. FUNCIÓN: recalculate_evidence_hash_trigger
--    Trigger SQL que invoca la Edge Function vía pg_net
--    después de INSERT o DELETE en session_evidence.
--
--    REQUISITO: extensión pg_net debe estar habilitada.
--    Activar desde: Dashboard → Database → Extensions → pg_net
-- ──────────────────────────────────────────────────────────

-- Habilitar extensión pg_net (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION invoke_evidence_hash_recalculation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session_id   UUID;
  _supabase_url TEXT;
  _service_key  TEXT;
BEGIN
  -- Obtener session_id según operación
  IF TG_OP = 'DELETE' THEN
    _session_id := OLD.session_id;
  ELSE
    _session_id := NEW.session_id;
  END IF;

  -- Leer variables de entorno del vault de Supabase
  -- (configuradas en Dashboard → Settings → Vault)
  SELECT decrypted_secret INTO _supabase_url
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;

  SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  -- Invocar Edge Function asíncronamente via pg_net
  PERFORM net.http_post(
    url     := _supabase_url || '/functions/v1/calculate-evidence-hash',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _service_key
    ),
    body    := jsonb_build_object(
      'sessionId', _session_id::TEXT
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger: después de INSERT o DELETE en session_evidence
CREATE TRIGGER trg_recalculate_evidence_hash
  AFTER INSERT OR DELETE ON public.session_evidence
  FOR EACH ROW
  EXECUTE FUNCTION invoke_evidence_hash_recalculation();


-- ──────────────────────────────────────────────────────────
-- FIN DE STORAGE
-- ──────────────────────────────────────────────────────────
COMMENT ON POLICY "storage_evidence_upload" ON storage.objects
  IS 'Solo usuarios autenticados pueden subir evidencias. Path obligatorio: {user_id}/{session_id}/{filename}';

COMMENT ON POLICY "storage_evidence_read_public" ON storage.objects
  IS 'Lectura pública del bucket session-evidence para verificación externa';

COMMENT ON POLICY "storage_evidence_delete" ON storage.objects
  IS 'Solo el dueño del archivo o un operador puede eliminar evidencias';
