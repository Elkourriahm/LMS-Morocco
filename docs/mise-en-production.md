# Mise en production : réglages hors dépôt

Checklist des réglages à appliquer à la main sur le projet Supabase **hébergé** et sur **Cloudflare**. `supabase/config.toml` ne configure que Supabase local : rien de ce qui suit n'est poussé par `supabase db push`.

À dérouler à la création de chaque environnement (préproduction, production), puis à revérifier à chaque story qui touche l'authentification, les emails ou les variables d'environnement. Cocher et dater dans la PR de déploiement.

Rappel : aucune donnée réelle d'enfant avant l'autorisation CNDP et le consentement des parents (ADR 0003).

## 1. Projet Supabase

### Création

- [ ] **Région UE** (ADR 0003) : par exemple `eu-west-3` (Paris) ou `eu-central-1` (Francfort). Elle ne se change plus après la création du projet.
- [ ] Un projet par environnement (préproduction, production), jamais partagé avec le développement local.
- [ ] Mot de passe de la base généré, conservé dans le gestionnaire de secrets, jamais dans le dépôt.

### Authentication › Sign In / Providers

Équivalents de `[auth]` et `[auth.email]` dans `config.toml` (ADR 0008).

- [ ] **Inscriptions désactivées** : « Allow new users to sign up » désactivé (équivalent de `[auth].enable_signup = false`). Les comptes sont créés côté serveur uniquement (invitations, S1-c).
- [ ] Fournisseur **Email activé** : il porte aussi la connexion.
- [ ] Tous les autres fournisseurs désactivés : téléphone, OAuth, anonyme, lien magique (pas de connexion sociale ni d'OTP, ADR 0008).
- [ ] **Longueur minimale du mot de passe : 10** (`minimum_password_length`), identique au formulaire « nouveau mot de passe ».
- [ ] « Confirm email » au choix : sans effet tant que les comptes sont créés confirmés côté serveur. À trancher avec les invitations (S1-c).
- [ ] « Secure password change » désactivé (`secure_password_change = false`). La réinitialisation passe par une session de récupération ; le réactiver casserait le parcours « mot de passe oublié ».
- [ ] Protection contre les mots de passe divulgués (« Leaked password protection ») : à activer si l'offre le permet.

### Authentication › URL Configuration

- [ ] **Site URL** : origine publique de l'application, sans « / » final, identique à `NEXT_PUBLIC_SITE_URL`. Exemple : `https://app.<domaine>`.
- [ ] **Redirect URLs** : liste exacte, sans joker large comme `https://<domaine>/**` :
  - `https://app.<domaine>/fr/reinitialisation/confirmer`
  - `https://app.<domaine>/ar/reinitialisation/confirmer`
  - Ajouter ici toute future URL de retour (invitations, S1-c), une par langue.
- [ ] Aucune URL `http://`, `localhost` ou `127.0.0.1` sur le projet de production.

### Authentication › Emails

- [ ] **SMTP personnalisé** (fournisseur d'envoi, domaine avec SPF, DKIM et DMARC). Le SMTP intégré de Supabase est limité à quelques messages par heure et réservé aux adresses de l'équipe : inutilisable pour le personnel des établissements.
- [ ] Expéditeur : adresse et nom de l'application, pas « Admin ».
- [ ] **Gabarit « Reset password »** : copier le sujet et le contenu de `supabase/templates/recovery.html` (FR et AR). Le lien doit rester exactement `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`. Le gabarit par défaut (`{{ .ConfirmationURL }}`) ne passe pas par `/reinitialisation/confirmer` et ne fonctionne pas avec l'application.
- [ ] Après toute modification de `recovery.html`, recopier le gabarit sur chaque projet. Le dépôt n'est pas la source de vérité en production.
- [ ] **Durée de validité des liens** (« Email OTP expiration ») : 3600 s en local (`otp_expiry`). En production, viser 15 à 60 minutes. Un lien ne sert qu'une fois.
- [ ] Délai minimal entre deux emails à une même adresse (`max_frequency`) : au moins 60 s en production (1 s en local).

### Authentication › Rate Limits

- [ ] Garder les valeurs par défaut de Supabase, ou plus strictes. Ne **pas** recopier les valeurs relevées en local pour les tests (`email_sent = 30`, `sign_in_sign_ups = 300`).
- [ ] Vérifier la limite d'envoi d'emails une fois le SMTP personnalisé configuré.

### Authentication › Sessions et JWT

- [ ] Clés de signature **asymétriques** (ES256, comme en local) : `getClaims()` dans `src/proxy.ts` vérifie alors la signature sans appel réseau. Les décisions d'accès passent par `getUser()` (ADR 0008).
- [ ] Durée du JWT : 3600 s (`jwt_expiry`), rotation des refresh tokens activée.

### API (Data API)

- [ ] Schémas exposés : `public` et `graphql_public` **uniquement**. Jamais `app_private` (ADR 0006).
- [ ] « Extra search path » : `public`, `extensions`.

### Base de données

- [ ] Migrations appliquées par `supabase db push` (projet lié), dans l'ordre, après `pnpm db:rollback-check` et `pnpm db:test` au vert en CI.
- [ ] Aucun seed : `pnpm db:seed-dev` refuse toute URL non locale et ne doit jamais tourner hors du poste.
- [ ] Après le premier `db push` : RLS activée sur toutes les tables de `public`. Le « Security Advisor » de Supabase ne doit signaler ni table sans RLS ni fonction `SECURITY DEFINER` sans `search_path`.
- [ ] Sauvegardes et restauration à tester avant les données réelles (S12).

## 2. Cloudflare (Workers via OpenNext, ADR 0004)

### Variables d'environnement

Le schéma de référence est `src/env.ts`, documenté dans `.env.example`.

| Variable                        | Valeur en production                                                                       | Type              |
| ------------------------------- | ------------------------------------------------------------------------------------------ | ----------------- |
| `APP_ENV`                       | `production` (active `secure` sur le cookie `lms_school_id`)                               | Variable          |
| `NEXT_PUBLIC_APP_NAME`          | Nom affiché                                                                                | Variable publique |
| `NEXT_PUBLIC_SITE_URL`          | `https://app.<domaine>`, sans « / » final, identique à la Site URL Supabase                | Variable publique |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL du projet Supabase                                                                     | Variable publique |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon (ou publishable) du projet                                                        | Variable publique |
| `SUPABASE_SERVICE_ROLE_KEY`     | Clé service_role, **seulement** quand les tâches système (cron, webhooks) seront déployées | **Secret**        |

- [ ] Les variables `NEXT_PUBLIC_*` sont **intégrées au build** par Next.js. Elles doivent être présentes à la compilation (CI de déploiement), pas seulement à l'exécution du Worker. Une valeur modifiée impose un nouveau build.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` en secret Worker (`wrangler secret put`), jamais en variable en clair, jamais préfixée `NEXT_PUBLIC_` (refusé par `src/env.ts`). Absente tant qu'aucune tâche système n'est déployée : l'application web n'en a pas besoin.
- [ ] `pnpm build` (avec `check:bundle`) au vert dans la CI de déploiement : la clé service_role ne doit pas apparaître dans `.next/static`.
- [ ] Aucune valeur de `.env.example` (clés locales de démonstration) en production.

### Domaine et sécurité

- [ ] Domaine personnalisé en HTTPS, redirection HTTP vers HTTPS, HSTS.
- [ ] Le domaine servi est identique à `NEXT_PUBLIC_SITE_URL` et à la Site URL Supabase, sinon les liens de réinitialisation sont refusés par GoTrue.
- [ ] Pas de cache CDN sur les réponses qui posent des cookies d'auth. `@supabase/ssr` envoie des en-têtes anti-cache, que `src/proxy.ts` recopie : vérifier qu'aucune règle de cache Cloudflare ne les écrase.
- [ ] Compatibilité OpenNext du proxy Next.js 16 (`src/proxy.ts`, runtime Node.js) : à valider (point ouvert de l'ADR 0005). Repli : `middleware.ts`.

## 3. Vérification après déploiement

- [ ] Inscription refusée : un `POST /auth/v1/signup` avec la clé anon renvoie `signup_disabled`.
- [ ] Connexion d'un compte de test, choix d'établissement, déconnexion, en FR et en AR.
- [ ] « Mot de passe oublié » de bout en bout : email reçu (pas dans les indésirables), lien vers `https://app.<domaine>/<locale>/reinitialisation/confirmer`, inutilisable une seconde fois.
- [ ] Cookie `lms_school_id` : `HttpOnly`, `Secure`, `SameSite=Lax`.
- [ ] `https://app.<domaine>/fr/connexion?next=//exemple.org` ne redirige pas hors du domaine après connexion.
- [ ] `app_private` absent de l'API : une requête REST avec l'en-tête `Accept-Profile: app_private` est refusée.
