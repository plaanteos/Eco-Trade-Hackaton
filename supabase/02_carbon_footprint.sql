-- Módulo de Huella de Carbono

CREATE TABLE public.carbon_footprint_offsets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.recycling_sessions(id) UNIQUE,
  user_id uuid REFERENCES public.profiles(id),
  kg_by_material jsonb,
  co2_avoided_kg decimal(10,3),
  trees_equivalent integer,
  calculated_at timestamptz DEFAULT now()
);

ALTER TABLE public.carbon_footprint_offsets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cf_offsets_select"
  ON public.carbon_footprint_offsets
  FOR SELECT
  TO authenticated
  USING (
    public.is_operator()
    OR EXISTS (
      SELECT 1 FROM public.recycling_sessions rs
      WHERE rs.id = carbon_footprint_offsets.session_id
        AND rs.user_id = auth.uid()
    )
  );

-- Insert solo service_role (backend)
-- Sin políticas INSERT/UPDATE para 'authenticated' -> denegado.

-- También damos permisos SELECT públicos para ver el impacto en la url de verificación pública
CREATE POLICY "cf_offsets_select_public"
  ON public.carbon_footprint_offsets
  FOR SELECT
  USING (true);
