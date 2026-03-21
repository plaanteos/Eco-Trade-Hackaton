-- ============================================================
--  EcoTrade – Row Level Security (RLS) Completo
--  Supabase (PostgreSQL)
--  Generado: 2026-03-20
--
--  INSTRUCCIONES DE USO:
--    Este archivo reemplaza la sección §12 de schema.sql.
--    Ejecutar DESPUÉS de que todas las tablas existan.
--    Las políticas básicas de schema.sql ya fueron removidas.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- HELPER: get_user_role()
--   Retorna el role del usuario actual ('Usuario' | 'Operador')
--   desde la tabla profiles. Retorna NULL si no hay sesión.
--   SECURITY DEFINER → evita recursión de RLS al leer profiles.
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Alias booleano de conveniencia (más legible en políticas)
CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Operador'
  );
$$;


-- ============================================================
-- TABLA: profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── SELECT ──────────────────────────────────────────────────
-- Un usuario autenticado puede ver SU PROPIO perfil.
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Un operador puede ver TODOS los perfiles.
CREATE POLICY "profiles_select_operator"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_operator());

-- ── INSERT ───────────────────────────────────────────────────
-- Solo al registrarse: auth.uid() deve coincidir con el id
-- insertado. (Este INSERT lo ejecuta service_role via trigger
-- handle_new_user, pero también se blinda aquí.)
CREATE POLICY "profiles_insert_self"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ── UPDATE ───────────────────────────────────────────────────
-- Solo el propio usuario puede actualizar su perfil.
-- Campos sensibles (role, eco_coins_balance) deben ser
-- modificados únicamente por service_role desde el backend.
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── DELETE ───────────────────────────────────────────────────
-- No se permite borrado de perfiles desde el cliente.
-- (La eliminación en auth.users propaga CASCADE automáticamente)


-- ============================================================
-- TABLA: collection_points
-- ============================================================
ALTER TABLE public.collection_points ENABLE ROW LEVEL SECURITY;

-- ── SELECT: público ──────────────────────────────────────────
-- Cualquier usuario (incluso anónimo) puede listar puntos activos.
CREATE POLICY "collection_points_select_public"
  ON public.collection_points
  FOR SELECT
  USING (is_active = TRUE);

-- Los operadores también pueden ver los puntos inactivos.
CREATE POLICY "collection_points_select_operator_all"
  ON public.collection_points
  FOR SELECT
  TO authenticated
  USING (public.is_operator());

-- ── INSERT ───────────────────────────────────────────────────
CREATE POLICY "collection_points_insert_operator"
  ON public.collection_points
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_operator());

-- ── UPDATE ───────────────────────────────────────────────────
CREATE POLICY "collection_points_update_operator"
  ON public.collection_points
  FOR UPDATE
  TO authenticated
  USING  (public.is_operator())
  WITH CHECK (public.is_operator());

-- ── DELETE ───────────────────────────────────────────────────
CREATE POLICY "collection_points_delete_operator"
  ON public.collection_points
  FOR DELETE
  TO authenticated
  USING (public.is_operator());


-- ============================================================
-- TABLA: recycling_sessions
-- ============================================================
ALTER TABLE public.recycling_sessions ENABLE ROW LEVEL SECURITY;

-- ── SELECT: Usuario ve solo sus sesiones ────────────────────
CREATE POLICY "sessions_select_own"
  ON public.recycling_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ── SELECT: Operador ve todas las sesiones ──────────────────
CREATE POLICY "sessions_select_operator"
  ON public.recycling_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_operator());

-- ── INSERT: solo autenticados; user_id = auth.uid() ─────────
CREATE POLICY "sessions_insert_authenticated"
  ON public.recycling_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── UPDATE: Usuario → solo sus sesiones en Borrador/Programada
CREATE POLICY "sessions_update_own_editable"
  ON public.recycling_sessions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status IN ('Borrador', 'Programada')
    AND NOT public.is_operator()
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- ── UPDATE: Operador → cualquier sesión ─────────────────────
CREATE POLICY "sessions_update_operator"
  ON public.recycling_sessions
  FOR UPDATE
  TO authenticated
  USING  (public.is_operator())
  WITH CHECK (public.is_operator());

-- ── DELETE: Nadie desde cliente (solo service_role) ──────────
-- (No se crean políticas DELETE → queda denegado por defecto con RLS activo)


-- ============================================================
-- TABLA: session_materials
-- ============================================================
ALTER TABLE public.session_materials ENABLE ROW LEVEL SECURITY;

-- Helper inline reutilizable como expresión:
--   is_session_owner(session_id)  → TRUE si auth.uid() es dueño
--   is_session_editable(session_id) → TRUE si sesión en Borrador

-- ── SELECT: dueño de sesión O operador ──────────────────────
CREATE POLICY "session_materials_select"
  ON public.session_materials
  FOR SELECT
  TO authenticated
  USING (
    public.is_operator()
    OR EXISTS (
      SELECT 1 FROM public.recycling_sessions rs
      WHERE rs.id = session_materials.session_id
        AND rs.user_id = auth.uid()
    )
  );

-- ── INSERT: dueño de sesión (estado Borrador) O operador ────
CREATE POLICY "session_materials_insert"
  ON public.session_materials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_operator()
    OR EXISTS (
      SELECT 1 FROM public.recycling_sessions rs
      WHERE rs.id = session_materials.session_id
        AND rs.user_id = auth.uid()
        AND rs.status = 'Borrador'
    )
  );

-- ── UPDATE: dueño de sesión (Borrador) O operador ──────────
CREATE POLICY "session_materials_update"
  ON public.session_materials
  FOR UPDATE
  TO authenticated
  USING (
    public.is_operator()
    OR EXISTS (
      SELECT 1 FROM public.recycling_sessions rs
      WHERE rs.id = session_materials.session_id
        AND rs.user_id = auth.uid()
        AND rs.status = 'Borrador'
    )
  )
  WITH CHECK (
    public.is_operator()
    OR EXISTS (
      SELECT 1 FROM public.recycling_sessions rs
      WHERE rs.id = session_materials.session_id
        AND rs.user_id = auth.uid()
        AND rs.status = 'Borrador'
    )
  );

-- ── DELETE: dueño de sesión (Borrador) O operador ──────────
CREATE POLICY "session_materials_delete"
  ON public.session_materials
  FOR DELETE
  TO authenticated
  USING (
    public.is_operator()
    OR EXISTS (
      SELECT 1 FROM public.recycling_sessions rs
      WHERE rs.id = session_materials.session_id
        AND rs.user_id = auth.uid()
        AND rs.status = 'Borrador'
    )
  );


-- ============================================================
-- TABLA: session_evidence
-- ============================================================
ALTER TABLE public.session_evidence ENABLE ROW LEVEL SECURITY;

-- ── SELECT: dueño de sesión O operador ──────────────────────
CREATE POLICY "session_evidence_select"
  ON public.session_evidence
  FOR SELECT
  TO authenticated
  USING (
    public.is_operator()
    OR EXISTS (
      SELECT 1 FROM public.recycling_sessions rs
      WHERE rs.id = session_evidence.session_id
        AND rs.user_id = auth.uid()
    )
  );

-- ── INSERT: dueño de sesión (Borrador o Programada) ─────────
--   El usuario puede subir evidencias solo mientras la sesión
--   está en fases tempranas; el operador puede en cualquier estado.
CREATE POLICY "session_evidence_insert_owner"
  ON public.session_evidence
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_operator()
    OR EXISTS (
      SELECT 1 FROM public.recycling_sessions rs
      WHERE rs.id = session_evidence.session_id
        AND rs.user_id = auth.uid()
        AND rs.status IN ('Borrador', 'Programada')
    )
  );

-- ── UPDATE: no permitido desde cliente (solo service_role recalcula hash)
--   Sin política UPDATE → denegado con RLS activo.

-- ── DELETE: solo operadores ──────────────────────────────────
CREATE POLICY "session_evidence_delete_operator"
  ON public.session_evidence
  FOR DELETE
  TO authenticated
  USING (public.is_operator());


-- ============================================================
-- TABLA: session_timeline
-- ============================================================
ALTER TABLE public.session_timeline ENABLE ROW LEVEL SECURITY;

-- ── SELECT: dueño de sesión O operador ──────────────────────
CREATE POLICY "session_timeline_select"
  ON public.session_timeline
  FOR SELECT
  TO authenticated
  USING (
    public.is_operator()
    OR EXISTS (
      SELECT 1 FROM public.recycling_sessions rs
      WHERE rs.id = session_timeline.session_id
        AND rs.user_id = auth.uid()
    )
  );

-- ── INSERT: solo service_role (backend escribe automáticamente)
--   No se crean políticas INSERT para 'authenticated' →
--   el cliente jamás podrá insertar entradas en el timeline.
--   service_role bypassa RLS por definición en Supabase.

-- ── UPDATE / DELETE: nadie desde cliente ────────────────────
--   Sin políticas → denegado con RLS activo.


-- ============================================================
-- TABLA: trust_scores
-- ============================================================
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;

-- ── SELECT: dueño de sesión O operador ──────────────────────
CREATE POLICY "trust_scores_select"
  ON public.trust_scores
  FOR SELECT
  TO authenticated
  USING (
    public.is_operator()
    OR EXISTS (
      SELECT 1 FROM public.recycling_sessions rs
      WHERE rs.id = trust_scores.session_id
        AND rs.user_id = auth.uid()
    )
  );

-- ── INSERT / UPDATE: solo service_role ──────────────────────
--   El cálculo de trust score es responsabilidad del backend.
--   Sin políticas para 'authenticated' → denegado.
--   service_role bypassa RLS.


-- ============================================================
-- TABLA: solana_receipts
-- ============================================================
ALTER TABLE public.solana_receipts ENABLE ROW LEVEL SECURITY;

-- ── SELECT: dueño de sesión O operador ──────────────────────
CREATE POLICY "solana_receipts_select"
  ON public.solana_receipts
  FOR SELECT
  TO authenticated
  USING (
    public.is_operator()
    OR EXISTS (
      SELECT 1 FROM public.recycling_sessions rs
      WHERE rs.id = solana_receipts.session_id
        AND rs.user_id = auth.uid()
    )
  );

-- ── INSERT / UPDATE: solo service_role ──────────────────────
--   Los receipts Solana los escribe exclusivamente el backend
--   tras confirmar la tx on-chain. Sin políticas cliente.


-- ============================================================
-- STORAGE: Políticas para el bucket 'session-evidence'
--   Ejecutar también en Supabase Storage → Policies
-- ============================================================

-- Permitir a usuarios autenticados subir evidencias
--   a su propia carpeta: {session_id}/{file_name}
-- (Esto se configura desde el dashboard o con:)
/*
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'allow_authenticated_upload',
  'session-evidence',
  '(auth.role() = ''authenticated'')'
);
*/

-- ──────────────────────────────────────────────────────────
-- VERIFICACIÓN: listar políticas activas por tabla
-- ──────────────────────────────────────────────────────────
-- Ejecuta esta query para verificar el estado del RLS:
/*
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;
*/

-- ──────────────────────────────────────────────────────────
-- FIN DE RLS
-- ──────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.get_user_role() IS 'Retorna el role del usuario autenticado actual desde profiles';
COMMENT ON FUNCTION public.is_operator()   IS 'Retorna TRUE si el usuario autenticado tiene role Operador';
