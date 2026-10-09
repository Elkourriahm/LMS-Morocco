import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/env';
import type { Database } from './database.types';

/**
 * Client Supabase pour les Client Components. Clé anon uniquement : chaque
 * requête est soumise à la RLS avec la session de l'utilisateur connecté.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
