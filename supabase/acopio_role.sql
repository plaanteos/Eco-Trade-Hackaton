-- ============================================================
--  EcoTrade – Nuevo actor: "Centro de Acopio"
--  Ejecutar DESPUÉS de schema.sql y rls.sql (idempotente).
-- ============================================================

-- 1. Permitir el nuevo role en profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('Usuario', 'Operador', 'Centro de Acopio'));

-- 2. Cada centro pertenece a un usuario "Centro de Acopio"
ALTER TABLE public.collection_points
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_collection_points_owner_id ON public.collection_points (owner_id);

-- 3. Helper
CREATE OR REPLACE FUNCTION public.is_acopio()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Centro de Acopio'
  );
$$;

-- 4. Políticas: el centro de acopio gestiona SOLO sus centros
DROP POLICY IF EXISTS "collection_points_select_acopio_own" ON public.collection_points;
CREATE POLICY "collection_points_select_acopio_own"
  ON public.collection_points FOR SELECT TO authenticated
  USING (owner_id = auth.uid() AND public.is_acopio());

DROP POLICY IF EXISTS "collection_points_insert_acopio" ON public.collection_points;
CREATE POLICY "collection_points_insert_acopio"
  ON public.collection_points FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.is_acopio());

DROP POLICY IF EXISTS "collection_points_update_acopio" ON public.collection_points;
CREATE POLICY "collection_points_update_acopio"
  ON public.collection_points FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND public.is_acopio())
  WITH CHECK (owner_id = auth.uid() AND public.is_acopio());

DROP POLICY IF EXISTS "collection_points_delete_acopio" ON public.collection_points;
CREATE POLICY "collection_points_delete_acopio"
  ON public.collection_points FOR DELETE TO authenticated
  USING (owner_id = auth.uid() AND public.is_acopio());

-- 5. Crear un usuario Centro de Acopio (manual):
--    a) Supabase Dashboard → Authentication → Users → "Add user"
--       (email + contraseña, marcar "Auto Confirm User").
--    b) Asignar el rol (reemplazar el email):
--
-- UPDATE public.profiles
--    SET role = 'Centro de Acopio', full_name = 'Nombre del Centro'
--  WHERE email = 'acopio@ejemplo.com';
