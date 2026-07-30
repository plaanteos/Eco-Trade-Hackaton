-- ============================================================
--  EcoTrade – RPCs requeridas por el Sessions Service
--  supabase/rpcs.sql
--
--  INSTRUCCIONES:
--    Ejecutar en Supabase Dashboard → SQL Editor
--    DESPUÉS de haber ejecutado schema.sql y rls.sql.
--
--  Estas funciones usan SECURITY DEFINER para permitir al
--  cliente autenticado escribir en tablas que el RLS protege
--  (session_timeline, trust_scores, solana_receipts, profiles).
--  Solo operan sobre datos a los que el usuario tiene acceso.
-- ============================================================


-- ──────────────────────────────────────────────────────────
-- RPC 1: insert_session_timeline
--   Inserta entrada en session_timeline verificando acceso.
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.insert_session_timeline(
  p_session_id UUID,
  p_status     TEXT,
  p_actor      TEXT,
  p_note       TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario tenga acceso a esta sesión
  IF NOT EXISTS (
    SELECT 1 FROM public.recycling_sessions rs
    WHERE rs.id = p_session_id
      AND (
        rs.user_id = auth.uid()
        OR public.is_operator()
      )
  ) THEN
    RAISE EXCEPTION 'Acceso denegado a la sesión %', p_session_id;
  END IF;

  INSERT INTO public.session_timeline (session_id, status, actor, note)
  VALUES (p_session_id, p_status, p_actor, p_note);
END;
$$;

COMMENT ON FUNCTION public.insert_session_timeline IS
  'Inserta entrada en session_timeline con verificación de acceso (SECURITY DEFINER)';


-- ──────────────────────────────────────────────────────────
-- RPC 2: upsert_trust_score
--   Crea o actualiza el trust_score de una sesión.
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_trust_score(
  p_session_id      UUID,
  p_score           INTEGER,
  p_level           TEXT,
  p_requires_review BOOLEAN,
  p_signals         TEXT   -- JSON string → cast a JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar acceso a la sesión
  IF NOT EXISTS (
    SELECT 1 FROM public.recycling_sessions rs
    WHERE rs.id = p_session_id
      AND (
        rs.user_id = auth.uid()
        OR public.is_operator()
      )
  ) THEN
    RAISE EXCEPTION 'Acceso denegado a la sesión %', p_session_id;
  END IF;

  INSERT INTO public.trust_scores (
    session_id,
    score,
    level,
    requires_review,
    signals
  )
  VALUES (
    p_session_id,
    p_score,
    p_level,
    p_requires_review,
    p_signals::JSONB
  )
  ON CONFLICT (session_id)
  DO UPDATE SET
    score           = EXCLUDED.score,
    level           = EXCLUDED.level,
    requires_review = EXCLUDED.requires_review,
    signals         = EXCLUDED.signals,
    calculated_at   = NOW();
END;
$$;

COMMENT ON FUNCTION public.upsert_trust_score IS
  'Crea o actualiza el trust_score de una sesión (SECURITY DEFINER)';


-- ──────────────────────────────────────────────────────────
-- RPC 3: insert_solana_receipt
--   Inserta o actualiza el recibo Solana de una sesión.
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.insert_solana_receipt(
  p_session_id   UUID,
  p_signature    TEXT,
  p_cluster      TEXT,
  p_explorer_url TEXT,
  p_program_id   TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo operadores pueden emitir recibos Solana
  IF NOT public.is_operator() THEN
    RAISE EXCEPTION 'Solo operadores pueden emitir recibos Solana';
  END IF;

  INSERT INTO public.solana_receipts (
    session_id,
    signature,
    cluster,
    explorer_url,
    program_id,
    status
  )
  VALUES (
    p_session_id,
    p_signature,
    p_cluster,
    p_explorer_url,
    p_program_id,
    'confirmed'
  )
  ON CONFLICT (session_id)
  DO UPDATE SET
    signature    = EXCLUDED.signature,
    cluster      = EXCLUDED.cluster,
    explorer_url = EXCLUDED.explorer_url,
    program_id   = EXCLUDED.program_id,
    emitted_at   = NOW(),
    status       = 'confirmed';
END;
$$;

COMMENT ON FUNCTION public.insert_solana_receipt IS
  'Inserta o actualiza el recibo Solana de una sesión. Solo Operadores (SECURITY DEFINER)';


-- ──────────────────────────────────────────────────────────
-- RPC 4: increment_profile_stats
--   Incrementa eco_coins_balance y total_kg_recycled
--   en el perfil de un usuario.
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_profile_stats(
  p_user_id     UUID,
  p_eco_coins   INTEGER,
  p_kg_recycled DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo operadores pueden actualizar stats de otros usuarios
  IF NOT public.is_operator() THEN
    RAISE EXCEPTION 'Solo operadores pueden actualizar estadísticas de perfil';
  END IF;

  UPDATE public.profiles
  SET
    eco_coins_balance = eco_coins_balance + p_eco_coins,
    total_kg_recycled = total_kg_recycled + p_kg_recycled,
    updated_at        = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado para user_id %', p_user_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.increment_profile_stats IS
  'Incrementa eco_coins y kg reciclados en el perfil de usuario. Solo Operadores (SECURITY DEFINER)';


-- ──────────────────────────────────────────────────────────
-- VERIFICACIÓN: listar las RPCs creadas
-- ──────────────────────────────────────────────────────────
/*
SELECT
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'insert_session_timeline',
    'upsert_trust_score',
    'insert_solana_receipt',
    'increment_profile_stats'
  )
ORDER BY routine_name;
*/

-- ──────────────────────────────────────────────────────────
-- RPC 5: upsert_carbon_offset
--   Crea o actualiza el impacto de huella de carbono de una sesión.
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_carbon_offset(
  p_session_id      UUID,
  p_user_id         UUID,
  p_co2_avoided_kg  DECIMAL,
  p_trees_equivalent INTEGER,
  p_kg_by_material  TEXT   -- JSON string → cast a JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar acceso a la sesión
  IF NOT EXISTS (
    SELECT 1 FROM public.recycling_sessions rs
    WHERE rs.id = p_session_id
      AND (
        rs.user_id = auth.uid()
        OR public.is_operator()
      )
  ) THEN
    RAISE EXCEPTION 'Acceso denegado a la sesión %', p_session_id;
  END IF;

  INSERT INTO public.carbon_footprint_offsets (
    session_id,
    user_id,
    co2_avoided_kg,
    trees_equivalent,
    kg_by_material
  )
  VALUES (
    p_session_id,
    p_user_id,
    p_co2_avoided_kg,
    p_trees_equivalent,
    p_kg_by_material::JSONB
  )
  ON CONFLICT (session_id)
  DO UPDATE SET
    co2_avoided_kg   = EXCLUDED.co2_avoided_kg,
    trees_equivalent = EXCLUDED.trees_equivalent,
    kg_by_material   = EXCLUDED.kg_by_material,
    calculated_at    = NOW();
END;
$$;

COMMENT ON FUNCTION public.upsert_carbon_offset IS
  'Crea o actualiza el impacto de huella de carbono de una sesión (SECURITY DEFINER)';


-- ──────────────────────────────────────────────────────────
-- RPC 6: complete_session_after_receipt
--   Cierra la sesión de forma idempotente después de una
--   emisión on-chain confirmada.
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.complete_session_after_receipt(
  p_session_id   UUID,
  p_operator_id  UUID,
  p_verified_by  TEXT,
  p_verified_kg  DECIMAL,
  p_eco_coins    INTEGER,
  p_note         TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_status  TEXT;
BEGIN
  IF NOT (public.is_operator() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Solo operadores autenticados o service_role pueden completar sesiones';
  END IF;

  SELECT rs.user_id, rs.status
    INTO v_user_id, v_status
  FROM public.recycling_sessions rs
  WHERE rs.id = p_session_id
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesión no encontrada para completar: %', p_session_id;
  END IF;

  IF v_status = 'Completada' THEN
    UPDATE public.recycling_sessions
    SET
      verified_total_kg = p_verified_kg,
      eco_coins         = p_eco_coins,
      operator_id       = COALESCE(operator_id, p_operator_id),
      verified_by       = COALESCE(NULLIF(verified_by, ''), p_verified_by),
      updated_at        = NOW()
    WHERE id = p_session_id;

    RETURN;
  END IF;

  UPDATE public.recycling_sessions
  SET
    status            = 'Completada',
    verified_total_kg = p_verified_kg,
    eco_coins         = p_eco_coins,
    operator_id       = p_operator_id,
    verified_by       = p_verified_by,
    updated_at        = NOW()
  WHERE id = p_session_id;

  UPDATE public.profiles
  SET
    eco_coins_balance = eco_coins_balance + p_eco_coins,
    total_kg_recycled = total_kg_recycled + p_verified_kg,
    updated_at        = NOW()
  WHERE id = v_user_id;

  INSERT INTO public.session_timeline (session_id, status, actor, note)
  VALUES (
    p_session_id,
    'Completada',
    'Operador',
    COALESCE(p_note, format('Verificado: %s kg -> %s ecoCoins', p_verified_kg, p_eco_coins))
  );
END;
$$;

COMMENT ON FUNCTION public.complete_session_after_receipt IS
  'Completa una sesión de forma idempotente después de un recibo Solana confirmado';


-- ──────────────────────────────────────────────────────────
-- FIN DE RPCs
-- ──────────────────────────────────────────────────────────
