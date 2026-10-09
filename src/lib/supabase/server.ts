import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/env';
import type { Database } from './database.types';

/**
 * Client Supabase pour les Server Components, Server Actions et Route
 * Handlers : clé anon et session de l'utilisateur lue dans les cookies, donc
 * soumis à la RLS. À recréer à chaque requête, jamais partagé.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Appelé depuis un Server Component, où les cookies sont en
            // lecture seule : le rafraîchissement de session se fera dans
            // src/proxy.ts (story S1, authentification).
          }
        },
      },
    },
  );
}
