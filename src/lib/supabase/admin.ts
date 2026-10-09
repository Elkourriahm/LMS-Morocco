import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/env';
import type { Database } from './database.types';

/**
 * Client Supabase service_role : CONTOURNE LA RLS et voit les données de tous
 * les établissements (ADR 0006).
 *
 * Réservé aux tâches système sans utilisateur : cron (relances, échéances),
 * webhooks (WhatsApp, paiement), scripts d'administration. Ne jamais l'utiliser
 * pour servir une requête utilisateur (page, Server Action, Route Handler
 * appelé par le navigateur) : utiliser `./server` à la place. Une tâche
 * système qui agit pour un établissement filtre explicitement par school_id.
 *
 * `server-only` fait échouer le build si ce module est importé côté client.
 */
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } =
    getServerEnv();

  return createClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
