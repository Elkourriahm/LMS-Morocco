// Logique de l'établissement courant (ADR 0008), sans dépendance à Next.js
// ni à Supabase : les accès (utilisateur, appartenances, cookie) sont
// injectés, ce qui la rend testable. Câblée par ./current-school.ts.
import { z } from 'zod';
import type { Database } from '@/lib/supabase/database.types';

export type AppRole = Database['public']['Enums']['app_role'];

/** Rôles du personnel, seuls admis dans l'application (S1-b). */
export const staffRoles = ['direction', 'caisse', 'enseignant'] as const;
export type StaffRole = (typeof staffRoles)[number];

export type School = { id: string; name: string };

/** Ligne de memberships de l'utilisateur, avec son établissement. */
export type MembershipRow = { role: AppRole; school: School | null };

export type StaffSchool = School & { roles: StaffRole[] };

export type StaffContext =
  | { status: 'unauthenticated' }
  | {
      status: 'ok';
      userId: string;
      schools: StaffSchool[];
      parentOnly: boolean;
    };

export type CurrentSchoolResult =
  | { status: 'ok'; school: School; roles: StaffRole[]; schools: StaffSchool[] }
  | { status: 'unauthenticated' }
  /** Aucun rôle du personnel ; `parentOnly` si l'utilisateur n'est que parent. */
  | { status: 'no-staff-access'; parentOnly: boolean }
  /** Plusieurs établissements et aucun choix enregistré. */
  | { status: 'choose-school' }
  /** Cookie présent mais invalide ou falsifié : à effacer. */
  | { status: 'invalid-cookie' };

export type CurrentSchoolDeps = {
  /** Utilisateur vérifié auprès du serveur d'auth (getUser), ou null. */
  getUserId(): Promise<string | null>;
  /** Appartenances de l'utilisateur, lues sous RLS (client utilisateur). */
  listMemberships(userId: string): Promise<MembershipRow[]>;
  /** Valeur brute du cookie d'établissement courant. */
  readSchoolCookie(): Promise<string | undefined>;
};

function isStaffRole(role: AppRole): role is StaffRole {
  return (staffRoles as readonly AppRole[]).includes(role);
}

/** Regroupe les rôles du personnel par établissement, triés par nom. */
export function groupStaffSchools(rows: MembershipRow[]): StaffSchool[] {
  const bySchool = new Map<string, StaffSchool>();
  for (const { role, school } of rows) {
    if (!school || !isStaffRole(role)) continue;
    const entry = bySchool.get(school.id) ?? { ...school, roles: [] };
    if (!entry.roles.includes(role)) entry.roles.push(role);
    bySchool.set(school.id, entry);
  }
  for (const entry of bySchool.values()) {
    entry.roles.sort((a, b) => staffRoles.indexOf(a) - staffRoles.indexOf(b));
  }
  return [...bySchool.values()].sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
}

export async function loadStaffContext(
  deps: Pick<CurrentSchoolDeps, 'getUserId' | 'listMemberships'>,
): Promise<StaffContext> {
  const userId = await deps.getUserId();
  if (!userId) return { status: 'unauthenticated' };
  const rows = await deps.listMemberships(userId);
  const schools = groupStaffSchools(rows);
  const parentOnly =
    schools.length === 0 && rows.some((row) => row.role === 'parent');
  return { status: 'ok', userId, schools, parentOnly };
}

const schoolIdSchema = z.uuid();

/**
 * Établissement courant de la requête. Le cookie n'est qu'une préférence :
 * il est revalidé à chaque appel contre les appartenances lues sous RLS.
 */
export async function loadCurrentSchool(
  deps: CurrentSchoolDeps,
): Promise<CurrentSchoolResult> {
  const context = await loadStaffContext(deps);
  if (context.status === 'unauthenticated') return context;

  const { schools, parentOnly } = context;
  if (schools.length === 0) return { status: 'no-staff-access', parentOnly };

  const cookie = await deps.readSchoolCookie();
  if (cookie !== undefined) {
    const parsed = schoolIdSchema.safeParse(cookie);
    const chosen = parsed.success
      ? schools.find((school) => school.id === parsed.data)
      : undefined;
    if (!chosen) return { status: 'invalid-cookie' };
    return {
      status: 'ok',
      school: { id: chosen.id, name: chosen.name },
      roles: chosen.roles,
      schools,
    };
  }

  const [only] = schools;
  if (schools.length === 1 && only) {
    return {
      status: 'ok',
      school: { id: only.id, name: only.name },
      roles: only.roles,
      schools,
    };
  }
  return { status: 'choose-school' };
}
