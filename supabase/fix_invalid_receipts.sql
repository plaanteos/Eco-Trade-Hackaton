-- ============================================================
-- FIX: Eliminar recibos Solana con firma inválida
-- (generados por el código viejo que usaba SHA-256 local)
--
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ANTES de volver a probar el flujo de verificación.
--
-- Las firmas reales de Solana son base58, de ~87-88 chars.
-- Las firmas falsas antiguas son hex lowercase de 64-88 chars.
-- ============================================================

-- 1. Ver qué recibos existen actualmente
SELECT 
  sr.id,
  sr.session_id,
  sr.signature,
  length(sr.signature) as sig_length,
  sr.cluster,
  sr.explorer_url,
  sr.status,
  sr.emitted_at
FROM public.solana_receipts sr
ORDER BY sr.emitted_at DESC;

-- 2. Borrar todos los recibos inválidos (firma hex de 64 chars generada con SHA-256)
--    y los que tienen cluster 'testnet' pero deberían ser devnet.
--    DESCOMENTA las líneas DELETE cuando estés seguro de querer eliminarlos.

-- DELETE FROM public.solana_receipts
-- WHERE 
--   length(signature) < 80        -- firmas reales de Solana tienen ~87 chars en base58
--   OR cluster = 'testnet'        -- debería ser devnet
--   OR status = 'failed'
--   OR status = 'pending';

-- 3. Alternativa: Marcar los recibos inválidos como 'failed' para que el botón
--    "Actualizar" los reintente:
-- UPDATE public.solana_receipts
-- SET status = 'failed'
-- WHERE length(signature) < 80 OR cluster = 'testnet';
