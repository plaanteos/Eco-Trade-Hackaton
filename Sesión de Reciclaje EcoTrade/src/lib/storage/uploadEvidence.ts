// ============================================================
//  EcoTrade – uploadEvidence
//  Frontend utility: sube evidencias a Supabase Storage
//  e inserta registros en session_evidence.
//
//  Uso:
//    import { uploadEvidence } from '@/lib/storage/uploadEvidence'
//
//    const urls = await uploadEvidence(sessionId, files)
// ============================================================

import { supabase } from "@/lib/supabase/client";

// ── Constantes ───────────────────────────────────────────
const BUCKET = "session-evidence";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ── Tipos ────────────────────────────────────────────────
export interface UploadResult {
  publicUrl: string;
  storagePath: string;
  fileName: string;
}

export interface UploadError {
  fileName: string;
  reason: string;
}

export interface UploadEvidenceResult {
  successful: UploadResult[];
  failed: UploadError[];
}

// ── Validación de archivos ───────────────────────────────

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return `Tipo no permitido: ${file.type}. Solo se aceptan JPEG, PNG, WebP y HEIC.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return `Archivo demasiado grande: ${sizeMB} MB. Máximo 10 MB.`;
  }
  return null;
}

function sanitizeFileName(name: string): string {
  // Eliminar caracteres especiales y espacios para URLs seguras
  const ext = name.split(".").pop()?.toLowerCase() ?? "jpg";
  const base = name
    .replace(/\.[^/.]+$/, "")            // quitar extensión
    .replace(/[^a-zA-Z0-9_-]/g, "_")    // solo alfanumérico
    .substring(0, 60);                   // máximo 60 chars
  const timestamp = Date.now();
  return `${base}_${timestamp}.${ext}`;
}

// ── Función principal ────────────────────────────────────

/**
 * Sube múltiples archivos de evidencia a Supabase Storage
 * e inserta los registros en la tabla session_evidence.
 *
 * @param sessionId  UUID de la sesión de reciclaje
 * @param files      Array de File objects a subir
 * @returns          URLs públicas de los archivos subidos exitosamente
 *
 * @throws Error si no hay usuario autenticado
 */
export async function uploadEvidence(
  sessionId: string,
  files: File[]
): Promise<UploadEvidenceResult> {
  if (!files.length) {
    return { successful: [], failed: [] };
  }

  // ── 1. Obtener usuario actual ────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Usuario no autenticado. Inicia sesión para subir evidencias.");
  }

  const userId = user.id;
  const successful: UploadResult[] = [];
  const failed: UploadError[] = [];

  // ── 2. Procesar archivos ─────────────────────────────
  for (const file of files) {
    // Validar tipo y tamaño
    const validationError = validateFile(file);
    if (validationError) {
      failed.push({ fileName: file.name, reason: validationError });
      continue;
    }

    const safeFileName = sanitizeFileName(file.name);
    // Path obligatorio: {user_id}/{session_id}/{filename}
    const storagePath = `${userId}/${sessionId}/${safeFileName}`;

    try {
      // ── 3. Subir a Supabase Storage ────────────────
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,       // No sobreescribir (timestamp garantiza unicidad)
        });

      if (uploadError) {
        failed.push({
          fileName: file.name,
          reason: `Error al subir: ${uploadError.message}`,
        });
        continue;
      }

      // ── 4. Obtener URL pública ─────────────────────
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      // ── 5. Insertar en session_evidence ───────────
      const { error: dbError } = await supabase
        .from("session_evidence")
        .insert({
          session_id:   sessionId,
          storage_path: storagePath,
          public_url:   publicUrl,
          file_name:    file.name,     // nombre original para mostrar al usuario
          uploaded_at:  new Date().toISOString(),
        });

      if (dbError) {
        // Si falla el INSERT, intentar borrar el archivo subido
        await supabase.storage.from(BUCKET).remove([storagePath]);
        failed.push({
          fileName: file.name,
          reason: `Error al registrar en base de datos: ${dbError.message}`,
        });
        continue;
      }

      successful.push({ publicUrl, storagePath, fileName: file.name });

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      failed.push({ fileName: file.name, reason: message });
    }
  }

  return { successful, failed };
}

// ── Función auxiliar: eliminar evidencia ─────────────────

/**
 * Elimina una evidencia del Storage y de la base de datos.
 *
 * @param evidenceId   UUID de la fila en session_evidence
 * @param storagePath  Path en Storage (para eliminar el archivo)
 */
export async function deleteEvidence(
  evidenceId: string,
  storagePath: string
): Promise<void> {
  // Eliminar archivo del Storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (storageError) {
    throw new Error(`Error al eliminar archivo: ${storageError.message}`);
  }

  // Eliminar registro de base de datos
  // (El trigger recalculará evidence_hash automáticamente)
  const { error: dbError } = await supabase
    .from("session_evidence")
    .delete()
    .eq("id", evidenceId);

  if (dbError) {
    throw new Error(`Error al eliminar registro: ${dbError.message}`);
  }
}

// ── Función auxiliar: obtener evidencias de sesión ───────

/**
 * Retorna todas las evidencias de una sesión ordenadas por fecha.
 */
export async function getSessionEvidence(sessionId: string) {
  const { data, error } = await supabase
    .from("session_evidence")
    .select("id, storage_path, public_url, file_name, uploaded_at")
    .eq("session_id", sessionId)
    .order("uploaded_at", { ascending: true });

  if (error) {
    throw new Error(`Error al obtener evidencias: ${error.message}`);
  }

  return data ?? [];
}
