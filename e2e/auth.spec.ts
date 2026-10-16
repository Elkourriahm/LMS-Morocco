// Authentification du personnel (S1-b, ADR 0008). Prérequis : Supabase
// local démarré et `pnpm db:seed-dev` (comptes fictifs).
import { type BrowserContext, type Page, expect, test } from '@playwright/test';
import { SEED_PASSWORD, seedSchools } from '../scripts/lib/seed-dev.mts';

const [schoolA, schoolB] = seedSchools;
const SCHOOL_COOKIE = 'lms_school_id';

async function login(
  page: Page,
  email: string,
  { locale = 'fr', password = SEED_PASSWORD } = {},
) {
  await page.goto(`/${locale}/connexion`);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('form button[type="submit"]').click();
}

async function schoolCookie(context: BrowserContext) {
  const cookies = await context.cookies();
  return cookies.find((cookie) => cookie.name === SCHOOL_COOKIE)?.value;
}

test.describe('connexion', () => {
  test('la direction arrive sur le tableau de bord, en français', async ({
    page,
  }) => {
    await login(page, 'direction@exemple.test');
    await expect(page).toHaveURL('/fr/tableau-de-bord');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByTestId('current-school')).toHaveText(schoolA.name);
    await expect(page.getByTestId('current-roles')).toHaveText('Direction');
  });

  test('même parcours en arabe, en RTL', async ({ page }) => {
    await login(page, 'direction@exemple.test', { locale: 'ar' });
    await expect(page).toHaveURL('/ar/tableau-de-bord');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('current-school')).toHaveText(schoolA.name);
    await expect(page.getByTestId('current-roles')).toHaveText('الإدارة');
  });

  test('mauvais mot de passe et email inexistant : exactement le même message', async ({
    page,
  }) => {
    await login(page, 'direction@exemple.test', {
      password: 'Mauvais-mot-de-passe',
    });
    const error = page.getByTestId('form-error');
    await expect(error).toBeVisible();
    await expect(error).toBeFocused();
    const wrongPassword = await error.textContent();

    await login(page, 'inconnu@exemple.test', {
      password: 'Mauvais-mot-de-passe',
    });
    await expect(error).toBeVisible();
    const unknownEmail = await error.textContent();

    expect(wrongPassword).toBe('Identifiants invalides.');
    expect(unknownEmail).toBe(wrongPassword);
    await expect(page).toHaveURL(/\/fr\/connexion/);
  });

  test('erreur de champ : associée au champ et focus dessus', async ({
    page,
  }) => {
    await page.goto('/fr/connexion');
    await page.locator('#password').fill('x');
    await page.locator('form button[type="submit"]').click();
    const email = page.locator('#email');
    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toHaveAttribute('aria-describedby', 'email-erreur');
    await expect(page.locator('#email-erreur')).toHaveText(
      'Ce champ est obligatoire.',
    );
  });

  test('page protégée sans session : connexion puis retour à la page demandée', async ({
    page,
  }) => {
    await page.goto('/fr/tableau-de-bord');
    await expect(page).toHaveURL('/fr/connexion?next=%2Ffr%2Ftableau-de-bord');
    await page.locator('#email').fill('direction@exemple.test');
    await page.locator('#password').fill(SEED_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL('/fr/tableau-de-bord');
  });

  test('un paramètre next externe est ignoré', async ({ page }) => {
    await page.goto('/fr/connexion?next=%2F%2Fevil.example');
    await page.locator('#email').fill('direction@exemple.test');
    await page.locator('#password').fill(SEED_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL('/fr/tableau-de-bord');
  });
});

test.describe('établissement courant', () => {
  test('membre de deux établissements : choix, puis changement', async ({
    page,
  }) => {
    await login(page, 'multi@exemple.test');
    await expect(page).toHaveURL('/fr/choisir-etablissement');

    await page.getByRole('button', { name: schoolA.name }).click();
    await expect(page).toHaveURL('/fr/tableau-de-bord');
    await expect(page.getByTestId('current-school')).toHaveText(schoolA.name);
    await expect(page.getByTestId('current-roles')).toHaveText('Enseignant');

    await page.getByRole('link', { name: 'Changer d’établissement' }).click();
    await expect(page).toHaveURL('/fr/choisir-etablissement');
    await page.getByRole('button', { name: schoolB.name }).click();
    await expect(page.getByTestId('current-school')).toHaveText(schoolB.name);
    await expect(page.getByTestId('current-roles')).toHaveText('Direction');
  });

  test('cookie falsifié vers un établissement inconnu : effacé, retour au choix', async ({
    page,
    context,
  }) => {
    await login(page, 'multi@exemple.test');
    await page.getByRole('button', { name: schoolA.name }).click();
    await expect(page.getByTestId('current-school')).toHaveText(schoolA.name);

    await context.addCookies([
      {
        name: SCHOOL_COOKIE,
        value: '5c000000-0000-4000-8000-0000000000ff',
        url: 'http://127.0.0.1:3000',
      },
    ]);
    await page.goto('/fr/tableau-de-bord');
    await expect(page).toHaveURL('/fr/choisir-etablissement');
    expect(await schoolCookie(context)).toBeUndefined();
  });

  test('cookie modifié vers un établissement dont l’utilisateur n’est pas membre : rejeté', async ({
    page,
    context,
  }) => {
    await login(page, 'direction@exemple.test');
    await expect(page.getByTestId('current-school')).toHaveText(schoolA.name);

    await context.addCookies([
      { name: SCHOOL_COOKIE, value: schoolB.id, url: 'http://127.0.0.1:3000' },
    ]);
    await page.goto('/fr/tableau-de-bord');
    // Renvoyé au choix (cookie effacé), qui sélectionne d'office le seul
    // établissement de l'utilisateur : jamais B.
    await expect(page).toHaveURL('/fr/tableau-de-bord');
    await expect(page.getByTestId('current-school')).toHaveText(schoolA.name);
    expect(await schoolCookie(context)).not.toBe(schoolB.id);
  });

  test('parent seulement : espace parent annoncé, pas de tableau de bord', async ({
    page,
  }) => {
    await login(page, 'parent@exemple.test');
    await expect(page).toHaveURL('/fr/acces-non-disponible');
    await expect(page.getByTestId('unavailable-message')).toHaveText(
      'L’espace parent arrive bientôt.',
    );
    await page.goto('/fr/tableau-de-bord');
    await expect(page).toHaveURL('/fr/acces-non-disponible');
    await expect(page.getByTestId('current-school')).toHaveCount(0);
  });
});

test.describe('déconnexion et mot de passe oublié', () => {
  test('la déconnexion ferme la session', async ({ page }) => {
    await login(page, 'caisse@exemple.test');
    await expect(page).toHaveURL('/fr/tableau-de-bord');
    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect(page).toHaveURL('/fr/connexion');

    await page.goto('/fr/tableau-de-bord');
    await expect(page).toHaveURL('/fr/connexion?next=%2Ffr%2Ftableau-de-bord');
  });

  test('mot de passe oublié : même message pour un email existant ou non', async ({
    page,
  }) => {
    const messages: (string | null)[] = [];
    for (const email of ['caisse@exemple.test', 'inconnu@exemple.test']) {
      await page.goto('/fr/mot-de-passe-oublie');
      await page.locator('#email').fill(email);
      await page.locator('form button[type="submit"]').click();
      const sent = page.getByTestId('reset-sent');
      await expect(sent).toBeVisible();
      messages.push(await sent.textContent());
    }
    expect(messages[0]).toBeTruthy();
    expect(messages[1]).toBe(messages[0]);
  });
});
