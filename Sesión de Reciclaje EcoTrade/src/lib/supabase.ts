import { createClient } from '@supabase/supabase-js';

// TIPOS: Necesitarás generar los tipos ejecutando:
// supabase gen types typescript --project-id TU_PROJECT_ID > src/types/supabase.ts
// import { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno para inicializar Supabase. Configura tu archivo .env.local');
}

// Inicialización del cliente estándar para el Frontend
// Recomendado: Agrega <Database> para autocompletado si generaste los tipos
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

/**
 * Cliente con permisos de administrador (service_role).
 * IMPORTANTE: ¡Solo usa este cliente en entornos de Backend (Edge Functions o Node.js)!
 * NUNCA expongas la variable SUPABASE_SERVICE_ROLE_KEY en el cliente Frontend.
 */
export const getSupabaseAdmin = (serviceRoleKey: string) => {
  if (!serviceRoleKey) throw new Error("Se requiere Service Role Key para Admin Client");
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
