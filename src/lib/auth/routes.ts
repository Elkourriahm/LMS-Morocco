// Chemins de l'authentification et de l'application, sans préfixe de langue
// (ADR 0008). Partagés par src/proxy.ts, les pages et les Server Actions.

export const authRoutes = {
  login: '/connexion',
  forgotPassword: '/mot-de-passe-oublie',
  resetConfirm: '/reinitialisation/confirmer',
  newPassword: '/nouveau-mot-de-passe',
  dashboard: '/tableau-de-bord',
  chooseSchool: '/choisir-etablissement',
  clearSchool: '/etablissement/reinitialiser',
  unavailable: '/acces-non-disponible',
} as const;

/**
 * Chemins accessibles sans session (après la langue). Tout le reste exige une
 * session : refus par défaut, une nouvelle page est protégée sans y penser.
 */
const publicPaths: readonly string[] = [
  '',
  '/',
  authRoutes.login,
  authRoutes.forgotPassword,
  authRoutes.resetConfirm,
];

export function isPublicPath(pathWithoutLocale: string): boolean {
  return publicPaths.includes(pathWithoutLocale);
}
