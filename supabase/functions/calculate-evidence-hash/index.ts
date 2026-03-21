// ============================================================
//  EcoTrade – Edge Function: calculate-evidence-hash
//  Supabase Edge Functions (Deno)
//  Ruta: supabase/functions/calculate-evidence-hash/index.ts
//
//  PROPÓSITO:
//    1. Recibe { sessionId } vía POST
//    2. Obtiene todos los storage_paths de session_evidence
//    3. Descarga cada archivo desde Supabase Storage
//    4. Calcula SHA-256 de cada archivo individualmente
//    5. Concatena todos los hashes y calcula SHA-256 final
//    6. Actualiza evidence_hash en recycling_sessions
//    7. Retorna el hash compuesto: 'sha256:{hash}'
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Tipos ────────────────────────────────────────────────
interface RequestBody {
  sessionId: string;
}

interface EvidenceRow {
  id: string;
  storage_path: string;
  file_name: string | null;
}

interface HashResult {
  sessionId: string;
  evidenceHash: string;
  fileCount: number;
  individualHashes: Array<{ path: string; hash: string }>;
  calculatedAt: string;
}

// ── Utilidades de hash ───────────────────────────────────

/**
 * Calcula SHA-256 de un ArrayBuffer y retorna hex string.
 */
async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Calcula SHA-256 de un string UTF-8 y retorna hex string.
 */
async function sha256String(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  return sha256Hex(data.buffer);
}

// ── Handler principal ────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  // Solo POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  // Variables de entorno (inyectadas automáticamente por Supabase)
  const supabaseUrl      = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Cliente con service_role → bypassa RLS
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    // ── 1. Parsear body ──────────────────────────────────
    const body: RequestBody = await req.json();
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return new Response(
        JSON.stringify({ error: "sessionId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── 2. Obtener paths de evidencia de la sesión ───────
    const { data: evidences, error: fetchError } = await supabase
      .from("session_evidence")
      .select("id, storage_path, file_name")
      .eq("session_id", sessionId)
      .order("uploaded_at", { ascending: true });

    if (fetchError) {
      throw new Error(`Error fetching evidence: ${fetchError.message}`);
    }

    // Si no hay evidencias, limpiar el hash
    if (!evidences || evidences.length === 0) {
      await supabase
        .from("recycling_sessions")
        .update({ evidence_hash: null })
        .eq("id", sessionId);

      return new Response(
        JSON.stringify({
          sessionId,
          evidenceHash: null,
          fileCount: 0,
          message: "No evidence files found. Hash cleared.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── 3. Descargar cada archivo y calcular SHA-256 ─────
    const individualHashes: Array<{ path: string; hash: string }> = [];

    for (const evidence of evidences as EvidenceRow[]) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("session-evidence")
        .download(evidence.storage_path);

      if (downloadError || !fileData) {
        console.error(
          `Failed to download ${evidence.storage_path}: ${downloadError?.message}`
        );
        // Registrar hash vacío para archivos que no se pudieron descargar
        individualHashes.push({
          path: evidence.storage_path,
          hash: "ERROR:DOWNLOAD_FAILED",
        });
        continue;
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const fileHash = await sha256Hex(arrayBuffer);

      individualHashes.push({
        path: evidence.storage_path,
        hash: fileHash,
      });
    }

    // ── 4. Hash compuesto: SHA-256 de la concatenación ──
    //   Formato: sha256(hash1 + "|" + hash2 + "|" + hashN)
    //   El separador "|" evita colisiones por concatenación.
    const concatenated = individualHashes
      .map((h) => h.hash)
      .join("|");

    const compositeHash = await sha256String(concatenated);
    const evidenceHash = `sha256:${compositeHash}`;

    // ── 5. Actualizar evidence_hash en recycling_sessions ─
    const { error: updateError } = await supabase
      .from("recycling_sessions")
      .update({
        evidence_hash: evidenceHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateError) {
      throw new Error(`Error updating evidence_hash: ${updateError.message}`);
    }

    // ── 6. Respuesta exitosa ─────────────────────────────
    const result: HashResult = {
      sessionId,
      evidenceHash,
      fileCount: evidences.length,
      individualHashes,
      calculatedAt: new Date().toISOString(),
    };

    console.log(
      `[calculate-evidence-hash] Session ${sessionId}: ${evidences.length} files → ${evidenceHash}`
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[calculate-evidence-hash] Error: ${message}`);

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
