# ADR 0008 : Authentification du personnel et établissement courant

- **Date** : 2026-10-16
- **Statut** : Acceptée

## Contexte

Le personnel (direction, caisse, enseignant) doit se connecter et travailler dans un établissement précis, parmi ceux où il a un rôle (ADR 0007). La RLS isole déjà les données par établissement ; l'application doit en plus savoir dans quel établissement l'utilisateur travaille, sans faire confiance au navigateur, et protéger ses pages en FR comme en AR. L'application tourne sur Next.js 16 (proxy à la place du middleware) et cible Cloudflare Workers (ADR 0004).

## Options

- **Mode de connexion** : email et mot de passe ; lien magique ou OTP par email ; connexion sociale (Google) ; OTP par SMS.
- **Création des comptes** : inscription publique ; création côté serveur uniquement (script, puis invitations).
- **Vérification de l'utilisateur côté serveur** : `getSession()` (lit le cookie) ; `getClaims()` (vérifie la signature du JWT, localement avec une clé asymétrique) ; `getUser()` (interroge le serveur d'auth).
- **Établissement courant** : segment d'URL (`/fr/<école>/…`) ; cookie ; colonne « établissement préféré » en base ; claim dans le JWT.

## Décision

1. **Email et mot de passe pour le personnel**, via Supabase Auth et le client serveur (`@/lib/supabase/server`) dans des Server Actions validées par zod. Mot de passe d'au moins 10 caractères (formulaire et `minimum_password_length` de GoTrue). Pas de connexion sociale, d'OTP ni de lien magique en S1-b.
2. **Inscription publique désactivée** (`[auth].enable_signup = false`). Les comptes sont créés côté serveur : `pnpm db:seed-dev` en local, les invitations en S1-c. Attention : `[auth.email].enable_signup` doit rester à `true`, sinon la CLI désactive tout le fournisseur email, connexion comprise.
3. **Parents en S7** (ADR 0007) : un utilisateur qui n'a que le rôle parent voit « L'espace parent arrive bientôt ». Seuls direction, caisse et enseignant accèdent aux pages de l'application.
4. **Pas d'énumération de comptes** : « Identifiants invalides » pour toute erreur de connexion, et le même message de confirmation pour une demande de réinitialisation, que l'email existe ou non. Aucune valeur saisie n'est journalisée.
5. **Réinitialisation du mot de passe** : l'email (`supabase/templates/recovery.html`, FR et AR) pointe vers `/<locale>/reinitialisation/confirmer?token_hash=…&type=recovery`. Ce Route Handler vérifie le jeton (`verifyOtp`), ouvre une session de récupération, puis renvoie vers `/<locale>/nouveau-mot-de-passe`. Le lien fonctionne depuis n'importe quel navigateur et ne sert qu'une fois. Il est construit à partir de `NEXT_PUBLIC_SITE_URL`, jamais de l'en-tête Host, et GoTrue n'accepte que les URL de `additional_redirect_urls`.
6. **`getUser()` pour toute décision d'accès côté serveur, jamais `getSession()` seul.** La documentation de `@supabase/ssr` 0.12.7 utilise `getClaims()` pour rafraîchir la session. Supabase local signe désormais en ES256 : `getClaims()` vérifie alors la signature localement (clés JWKS), sans voir une session révoquée ni un compte supprimé. D'où la répartition :
   - `src/proxy.ts` appelle `getClaims()` : rafraîchissement des cookies et tri grossier (redirection vers la connexion) ;
   - `getCurrentSchool()` / `getStaffContext()` appellent `getUser()` : c'est la décision qui compte, une fois par requête (`React.cache`).
7. **Un seul proxy** (`src/proxy.ts`) : Supabase d'abord (les cookies rafraîchis sont écrits dans la requête, pour que les Server Components de la même requête les voient, puis repris sur la réponse avec les en-têtes anti-cache), next-intl ensuite, puis la protection des pages. Refus par défaut : tout chemin sous `/<locale>` exige une session, sauf la liste publique de `src/lib/auth/routes.ts` (accueil, connexion, mot de passe oublié, confirmation du lien).
8. **Protection contre la redirection ouverte** : la page demandée est passée dans `next` et validée par `safeNextPath()` (`src/lib/auth/next-path.ts`). Seul un chemin relatif interne commençant par une seule « / » est accepté : pas de `//hôte`, de `/\hôte`, d'URL absolue, de caractère de contrôle ni d'espace (les navigateurs suppriment tabulations et retours à la ligne). Le chemin est résolu comme URL et doit rester sur l'origine. Sinon : tableau de bord.
9. **Établissement courant en cookie, revalidé à chaque requête.** Cookie `lms_school_id` : `httpOnly`, `secure` en production, `sameSite=lax`, 30 jours. Ce n'est qu'une préférence : `getCurrentSchool()` (`src/lib/auth/current-school.ts`) relit à chaque requête les appartenances de l'utilisateur avec le client utilisateur (donc sous RLS) et vérifie que l'établissement du cookie en fait partie avec un rôle du personnel :
   - aucun établissement → `/acces-non-disponible` ;
   - un seul → sélectionné d'office, sans cookie ;
   - plusieurs sans cookie → `/choisir-etablissement` (Server Action `selectSchool`, qui revérifie l'appartenance avant d'écrire le cookie) ;
   - cookie invalide ou falsifié → `/etablissement/reinitialiser`, Route Handler qui l'efface (un Server Component ne peut pas modifier les cookies) puis renvoie au choix.
     Toute page de l'application passe par `getCurrentSchool()`. La logique est isolée dans `current-school-core.ts`, testée avec des dépendances simulées.
10. **Déconnexion** : `signOut({ scope: 'local' })` (cet appareil seulement) et effacement du cookie d'établissement, puis `/<locale>/connexion`.
11. **Seed de développement** : `pnpm db:seed-dev` crée des données fictives via l'API admin (`service_role`), refuse toute URL Supabase non locale avant tout appel réseau, et est idempotent. Il réutilise `src/lib/supabase/admin.ts` (Node avec `--conditions=react-server` et un hook de résolution de l'alias `@/`). La règle ESLint d'`admin.ts` couvre aussi `scripts/` et `e2e/` et les `import()` dynamiques ; seuls le seed et ses deux tests d'intégration (trigger d'inscription, idempotence du seed) y échappent.

Alternatives écartées : lien magique ou OTP (dépend de la boîte mail à chaque connexion, peu adapté à un poste de caisse partagé ; possible plus tard) ; connexion sociale (comptes Google personnels du personnel, hors périmètre) ; OTP SMS (coût, et reporté avec les parents) ; inscription publique (n'importe qui créerait un compte, même sans accès) ; `getSession()` (lit un cookie que le client contrôle) ; `getClaims()` seul pour l'accès (ne voit pas une révocation) ; établissement dans l'URL (toutes les routes et tous les liens à réécrire, fuite de l'identifiant dans l'historique et les journaux ; rien ne l'empêche plus tard) ; établissement préféré en base (une écriture à chaque changement, et partagé entre appareils) ; claim JWT (périmé jusqu'au rafraîchissement du jeton, hook d'auth à maintenir).

## Conséquences

- Une page de l'application qui oublie `getCurrentSchool()` reste protégée par le proxy (session exigée) et par la RLS, mais n'a pas d'établissement courant : la règle est dans CLAUDE.md.
- Chaque requête vers une page de l'application fait un appel `getUser()` au serveur d'auth et une lecture de `memberships`. À surveiller en production (latence UE depuis le Maroc).
- Les Server Actions revérifient elles-mêmes l'utilisateur : le proxy ne couvre pas toutes les routes (Next.js le rappelle dans sa documentation).
- En local, les emails sont lus dans Mailpit (http://127.0.0.1:54324). Les limites de débit d'auth de `supabase/config.toml` sont relevées pour les tests ; celles du projet distant se règlent à part.
- Les tests e2e tournent sur un build de production (`next build` puis `next start`) : sous requêtes parallèles, `next dev` 16.3.8 échoue par intermittence (« Unexpected end of JSON input » en générant les routes).
- La différence de temps de réponse entre un email existant et inexistant (envoi d'un email) n'est pas masquée.
