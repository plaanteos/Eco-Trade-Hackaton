-- ============================================================
--  EcoTrade – Esquema SQL Completo para Supabase (PostgreSQL)
--  Generado: 2026-03-20
--  Descripción: App de sesiones de reciclaje con verificación
--               on-chain en Solana.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 0. EXTENSIONES
-- ──────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ──────────────────────────────────────────────────────────
-- 1. TIPOS / DOMINIOS COMPARTIDOS
-- ──────────────────────────────────────────────────────────

-- Materiales válidos (reutilizado en varios CHECK)
-- Se define como dominio para centralizar la validación.
CREATE DOMAIN material_type AS TEXT
  CHECK (VALUE IN (
    'Plástico',
    'Vidrio',
    'Papel y cartón',
    'Metal',
    'Electrónicos (RAEE)'
  ));


-- ──────────────────────────────────────────────────────────
-- 2. FUNCIÓN UTILS: updated_at trigger
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ──────────────────────────────────────────────────────────
-- 3. FUNCIÓN: auto-generar session_number secuencial
--    Formato: '000001', '000002', …
-- ──────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS recycling_session_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION generate_session_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.session_number IS NULL THEN
    NEW.session_number := LPAD(nextval('recycling_session_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;


-- ──────────────────────────────────────────────────────────
-- 4. TABLA: profiles
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                 UUID           PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email              TEXT           NOT NULL,
  full_name          TEXT,
  role               TEXT           NOT NULL DEFAULT 'Usuario'
                                    CHECK (role IN ('Usuario', 'Operador')),
  wallet_address     TEXT,                        -- Dirección Solana derivada por Alchemy
  eco_coins_balance  INTEGER        NOT NULL DEFAULT 0
                                    CHECK (eco_coins_balance >= 0),
  total_kg_recycled  DECIMAL(10, 3) NOT NULL DEFAULT 0
                                    CHECK (total_kg_recycled >= 0),
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Trigger updated_at → profiles
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_email          ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role           ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles (wallet_address);


-- ──────────────────────────────────────────────────────────
-- 5. TABLA: collection_points
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collection_points (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT        NOT NULL,
  address             TEXT        NOT NULL,
  schedule            TEXT        NOT NULL,
  accepted_materials  TEXT[]      NOT NULL
                                  CHECK (
                                    accepted_materials <@ ARRAY[
                                      'Plástico',
                                      'Vidrio',
                                      'Papel y cartón',
                                      'Metal',
                                      'Electrónicos (RAEE)'
                                    ]::TEXT[]
                                  ),
  instructions        TEXT,
  limits              TEXT,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_collection_points_is_active ON collection_points (is_active);


-- ──────────────────────────────────────────────────────────
-- 6. TABLA: recycling_sessions
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recycling_sessions (
  id                    UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_number        TEXT           UNIQUE,                        -- auto-generado por trigger
  user_id               UUID           NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  operator_id           UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  collection_point_id   UUID           NOT NULL REFERENCES collection_points(id) ON DELETE RESTRICT,
  status                TEXT           NOT NULL DEFAULT 'Borrador'
                                       CHECK (status IN (
                                         'Borrador',
                                         'Programada',
                                         'En curso',
                                         'Pendiente de verificación',
                                         'Completada',
                                         'Cancelada'
                                       )),
  scheduled_date        DATE,
  scheduled_time        TEXT,
  total_kg              DECIMAL(10, 3) NOT NULL DEFAULT 0
                                       CHECK (total_kg >= 0),
  verified_total_kg     DECIMAL(10, 3) CHECK (verified_total_kg >= 0),
  eco_coins             INTEGER        NOT NULL DEFAULT 0
                                       CHECK (eco_coins >= 0),
  estimated_eco_coins   INTEGER        NOT NULL DEFAULT 0
                                       CHECK (estimated_eco_coins >= 0),
  evidence_hash         TEXT,                                         -- SHA-256 del conjunto de evidencias
  cancellation_reason   TEXT,
  operator_note         TEXT,
  verified_by           TEXT,
  qr_code               TEXT           UNIQUE,
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Trigger: auto-generar session_number antes de INSERT
CREATE TRIGGER trg_recycling_sessions_number
  BEFORE INSERT ON recycling_sessions
  FOR EACH ROW EXECUTE FUNCTION generate_session_number();

-- Trigger updated_at → recycling_sessions
CREATE TRIGGER trg_recycling_sessions_updated_at
  BEFORE UPDATE ON recycling_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_rs_user_id               ON recycling_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_rs_operator_id           ON recycling_sessions (operator_id);
CREATE INDEX IF NOT EXISTS idx_rs_collection_point_id   ON recycling_sessions (collection_point_id);
CREATE INDEX IF NOT EXISTS idx_rs_status                ON recycling_sessions (status);
CREATE INDEX IF NOT EXISTS idx_rs_scheduled_date        ON recycling_sessions (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_rs_created_at            ON recycling_sessions (created_at DESC);


-- ──────────────────────────────────────────────────────────
-- 7. TABLA: session_materials
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_materials (
  id             UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id     UUID           NOT NULL REFERENCES recycling_sessions(id) ON DELETE CASCADE,
  material_type  material_type  NOT NULL,
  kg             DECIMAL(10, 3) NOT NULL CHECK (kg > 0),
  observation    TEXT,
  verified       BOOLEAN        NOT NULL DEFAULT FALSE,
  verified_kg    DECIMAL(10, 3) CHECK (verified_kg >= 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sm_session_id     ON session_materials (session_id);
CREATE INDEX IF NOT EXISTS idx_sm_material_type  ON session_materials (material_type);


-- ──────────────────────────────────────────────────────────
-- 8. TABLA: session_evidence
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_evidence (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID        NOT NULL REFERENCES recycling_sessions(id) ON DELETE CASCADE,
  storage_path  TEXT        NOT NULL,   -- path en Supabase Storage
  public_url    TEXT,
  file_name     TEXT,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_se_session_id ON session_evidence (session_id);


-- ──────────────────────────────────────────────────────────
-- 9. TABLA: session_timeline
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_timeline (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID        NOT NULL REFERENCES recycling_sessions(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL,
  actor       TEXT        CHECK (actor IN ('Usuario', 'Operador', 'Sistema')),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_st_session_id  ON session_timeline (session_id);
CREATE INDEX IF NOT EXISTS idx_st_created_at  ON session_timeline (created_at DESC);


-- ──────────────────────────────────────────────────────────
-- 10. TABLA: trust_scores
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trust_scores (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID        NOT NULL UNIQUE REFERENCES recycling_sessions(id) ON DELETE CASCADE,
  score           INTEGER     NOT NULL CHECK (score BETWEEN 0 AND 100),
  level           TEXT        NOT NULL CHECK (level IN ('Alta', 'Media', 'Baja')),
  requires_review BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Array de objetos: [{ id, label, passed, critical }, ...]
  signals         JSONB       NOT NULL DEFAULT '[]'::JSONB,
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ts_session_id      ON trust_scores (session_id);
CREATE INDEX IF NOT EXISTS idx_ts_level           ON trust_scores (level);
CREATE INDEX IF NOT EXISTS idx_ts_requires_review ON trust_scores (requires_review);
CREATE INDEX IF NOT EXISTS idx_ts_signals         ON trust_scores USING GIN (signals);


-- ──────────────────────────────────────────────────────────
-- 11. TABLA: solana_receipts
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS solana_receipts (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID        NOT NULL UNIQUE REFERENCES recycling_sessions(id) ON DELETE CASCADE,
  signature     TEXT        NOT NULL,
  cluster       TEXT        NOT NULL DEFAULT 'devnet',
  explorer_url  TEXT,
  program_id    TEXT,
  emitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'confirmed', 'failed'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sr_session_id ON solana_receipts (session_id);
CREATE INDEX IF NOT EXISTS idx_sr_status     ON solana_receipts (status);
CREATE INDEX IF NOT EXISTS idx_sr_signature  ON solana_receipts (signature);


-- ──────────────────────────────────────────────────────────
-- 12. ROW LEVEL SECURITY (RLS)
--   ► Las políticas detalladas están en: supabase/rls.sql
--     Ejecutar rls.sql DESPUÉS de este archivo.
--     Incluye: funciones helper get_user_role() / is_operator(),
--     políticas granulares por operación (SELECT/INSERT/UPDATE/DELETE)
--     y separación correcta entre roles 'authenticated' y 'service_role'.
-- ──────────────────────────────────────────────────────────


-- ──────────────────────────────────────────────────────────
-- 13. FUNCIÓN: handle_new_user (auth trigger)
--     Crea automáticamente el perfil al registrar usuario
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Disparo tras registro en auth.users
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ──────────────────────────────────────────────────────────
-- 14. SEED DATA: 4 Puntos de Acopio Reales
-- ──────────────────────────────────────────────────────────
INSERT INTO collection_points (id, name, address, schedule, accepted_materials, instructions, limits, is_active)
VALUES
  (
    uuid_generate_v4(),
    'Centro de Acopio Municipal',
    'Av. Principal 1200, Sector Centro',
    'Lunes a Viernes 08:00–18:00 | Sábado 09:00–14:00',
    ARRAY['Plástico', 'Vidrio', 'Papel y cartón', 'Metal', 'Electrónicos (RAEE)'],
    'Presentarse con los materiales separados y limpios. Traer comprobante de identidad para acumulación de EcoCoins.',
    'Máximo 50 kg por visita. Electrónicos: máx. 5 unidades.',
    TRUE
  ),
  (
    uuid_generate_v4(),
    'EcoPunto Norte',
    'Pasaje Los Álamos 340, Barrio Norte',
    'Martes, Jueves y Sábado 09:00–17:00',
    ARRAY['Plástico', 'Vidrio', 'Papel y cartón', 'Metal'],
    'Los materiales deben estar limpios y sin residuos de comida. El plástico debe estar compactado si es posible.',
    'Límite de 30 kg por visita. No se aceptan vidrios rotos sueltos.',
    TRUE
  ),
  (
    uuid_generate_v4(),
    'Recicladora del Sur',
    'Ruta 5 Sur km 12, Parque Industrial',
    'Lunes a Sábado 07:00–20:00',
    ARRAY['Plástico', 'Metal', 'Electrónicos (RAEE)'],
    'Acceso vehicular disponible para grandes volúmenes. Coordinar visita previa para electrónicos en cantidad.',
    'Sin límite de kg para metales. RAEE: coordinar con operador para volúmenes mayores a 10 unidades.',
    TRUE
  ),
  (
    uuid_generate_v4(),
    'Centro Comunitario El Bosque',
    'Calle Los Robles 88, Población El Bosque',
    'Miércoles y Viernes 10:00–16:00 | Primer sábado del mes 09:00–13:00',
    ARRAY['Plástico', 'Vidrio', 'Papel y cartón'],
    'Punto de proximidad comunitario. Ideal para reciclaje doméstico. Los materiales deben estar secos y limpios.',
    'Máximo 15 kg por visita. Solo materiales domésticos.',
    TRUE
  );


-- ──────────────────────────────────────────────────────────
-- 15. STORAGE BUCKETS (referencia / ejecutar en panel Supabase)
-- ──────────────────────────────────────────────────────────
-- Los siguientes buckets deben crearse desde el panel Supabase
-- Storage o via Management API. Se documenta aquí como referencia.
--
-- Bucket: 'session-evidence'
--   - public: false
--   - allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
--   - fileSizeLimit: 10MB
--   - path template: {session_id}/{file_name}
--
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'session-evidence',
--   'session-evidence',
--   false,
--   10485760,
--   ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
-- );


-- ──────────────────────────────────────────────────────────
-- FIN DEL ESQUEMA
-- ──────────────────────────────────────────────────────────
COMMENT ON TABLE profiles            IS 'Perfiles de usuario extendidos, vinculados a auth.users';
COMMENT ON TABLE collection_points   IS 'Puntos de acopio físicos donde se realizan las sesiones de reciclaje';
COMMENT ON TABLE recycling_sessions  IS 'Sesiones de reciclaje con trazabilidad completa';
COMMENT ON TABLE session_materials   IS 'Detalle de materiales por sesión (tipo, kg, verificación)';
COMMENT ON TABLE session_evidence    IS 'Evidencias fotográficas/video subidas a Supabase Storage';
COMMENT ON TABLE session_timeline    IS 'Historial de cambios de estado de una sesión (audit trail)';
COMMENT ON TABLE trust_scores        IS 'Score de confianza calculado por IA antes de verificación on-chain';
COMMENT ON TABLE solana_receipts     IS 'Receipts de transacciones Solana que certifican sesiones completadas';
